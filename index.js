'use strict'

const through = require('through2')
const path = require('path')
const www1 = require('pc-www1')
const fs = require('fs')
const prompt = require('prompt')
const chalk = require('chalk')
const homedir = require('os').homedir()

module.exports = function (opts) {
  const PLUGIN_NAME = 'gulp-www1'

  let fileName

  let {
    targetPath,
    site
  } = opts

  let isFirst = true

  www1.init({
    site: site
  })

  function upload (opts, file, next, emit) {
    if (file.isStream()) {
      console.error(PLUGIN_NAME, ':Streams are not supported!')
      return next()
    }

    if (file.isNull() || file.stat.isDirectory() || file.stat.size <= 0) {
      return console.error(PLUGIN_NAME, `:${fileName}文件夹上传失败，不支持上传文件夹，上传中止!`)
    }

    www1.upload(file.path, {
      targetPath,
      user: {
        username: opts.username,
        password: opts.password
      }
    }).then(() => {
      next()
    }).catch(err => {
      console.error(PLUGIN_NAME, `:${err}`)
    })
  }

  return through.obj(function (file, enc, next) {
    fileName = path.basename(file.path)
    if (isFirst) {
      isFirst = false

      if (!opts.username || !opts.password) {
        let user
        try {
          user = JSON.parse(fs.readFileSync(path.resolve(homedir, '.pcuserconf')))
        } catch (error) {
          const confName = 'PCUSERCONF'
          user = {}
          let dir = process.cwd()
          while (dir) {
            const files = fs.readdirSync(dir)
  
            files.forEach(file => {
              if (file === confName) {
                let confArr = fs.readFileSync(dir + path.sep + confName).toString().split('\n')
  
                confArr.forEach(i => {
                  i.indexOf('username') !== -1 && (user.username = i.replace(/username:(.+)/, '$1').trim())
                  i.indexOf('password') !== -1 && (user.password = i.replace(/password:(.+)/, '$1').trim())
                  i.indexOf('city') !== -1 && (user.city = i.replace(/city:(.+)/, '$1').trim())
                })
              }
            })
  
            const _dir = path.resolve(dir, '..')
            dir = _dir === dir ? null : _dir
          }
        }

        if (!user.username || !user.password) {
          return console.error(PLUGIN_NAME, ':未找到用户配置文件 .pcuserconf，无法获取到用户名和密码！')
        }
        opts.username = user.username
        opts.password = user.password
      }

      prompt.start()
      prompt.get({
        name: 'isUpload',
        description: chalk.blue(`${opts.username}, 你将上传 ${fileName} 等文件到 ${chalk.yellow(`www1.${opts.site}.com.cn/${opts.targetPath.replace(/([^\/]$)/, '$1/')}`)} \n输入 y 确认操作，否则输入n `),
        type: 'string',
        pattern: /^[y,n]$/,
        message: '请输入y或n',
        required: true,
        before (value) { return value === 'y' }
      }, (err, res) => {
        if (err) {
          return console.error(PLUGIN_NAME, `:${err}`)
        }
        if (res.isUpload) {
          upload(opts, file, next, this.emit)
        }
      })
    } else {
      upload(opts, file, next)
    }
  })
}
