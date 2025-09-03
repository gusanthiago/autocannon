'use strict'

const { resolve, basename } = require('path')
const { readFileSync } = require('fs')

function getFormData (string) {
  try {
    return JSON.parse(string)
  } catch (error) {
    try {
      const path = resolve(string)
      const data = readFileSync(path, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      throw new Error('Invalid JSON or file where to get form data')
    }
  }
}

module.exports = (options) => {
  const obj = typeof options === 'string' ? getFormData(options) : options
  const form = new FormData()
  const formData = []
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2)

  for (const key in obj) {
    const item = obj[key]
    const type = item?.type

    switch (type) {
      case 'file': {
        if (!item.path) {
          throw new Error(`Missing key 'path' in form object for key '${key}'`)
        }
        const buffer = readFileSync(item.path)
        const filename = item.options?.filepath || item.options?.filename || basename(item.path)

        formData.push({ key, type: 'file', buffer, filename })
        form.append(key, new Blob([buffer]), { filename })
        break
      }
      case 'text': {
        if (!item.value) {
          throw new Error(`Missing key 'value' in form object for key '${key}'`)
        }
        formData.push({ key, type: 'text', value: item.value })
        form.append(key, item.value)
        break
      }
      default:
        throw new Error('A \'type\' key with value \'text\' or \'file\' should be specified')
    }
  }

  return {
    form,
    getBuffer: () => {
      let body = ''
      for (const item of formData) {
        body += `--${boundary}\r\n`
        if (item.type === 'file') {
          body += `Content-Disposition: form-data; name="${item.key}"; filename="${item.filename}"\r\n`
          body += 'Content-Type: application/octet-stream\r\n\r\n'
          body += item.buffer.toString('binary') + '\r\n'
        } else {
          body += `Content-Disposition: form-data; name="${item.key}"\r\n\r\n`
          body += `${item.value}\r\n`
        }
      }
      body += `--${boundary}--\r\n`
      return Buffer.from(body, 'binary')
    },
    getHeaders: () => ({
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    })
  }
}
