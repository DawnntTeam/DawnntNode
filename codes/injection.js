'use strict'
const util = require('util')
const sequelize = require('sequelize')

module.exports = function * (next) {
  this.log = function (message) {
    console.log(message)
  }
  this.warn = function (message) {
    console.warn(message)
  }
  this.error = function (message) {
    console.error(message)
  }
  this.message = function (v, s) {
    if (this.throw) {
      this.throw(s || 400, {isMessage: true, message: JSON.stringify({ message: v, status: s || 400, isError: true })})
    }
  }
  this.checkAuth = function () {
    if (!this.user) {
      this.message('请登录', 401)
    }
  }
  this.throw400 = function (v) {
    if (v) {
      this.message(v, 400)
    } else {
      this.message('出现错误', 400)
    }
  }
  this.throw403 = function (v) {
    if (v) {
      this.message('无法执行 ' + v, 403)
    } else {
      this.message('无法执行', 403)
    }
  }
  this.throw404 = function (v) {
    if (v) {
      this.message('找不到信息 ' + v, 404)
    } else {
      this.message('找不到信息', 404)
    }
  }
  this.throw412 = function (v) {
    if (v) {
      this.message('参数 ' + v + ' 错误', 412)
    } else {
      this.message('参数错误', 412)
    }
  }
  this.throw500 = function (v) {
    if (v) {
      this.message(v, 500)
    } else {
      this.message('出现错误', 500)
    }
  }
  this.required = function () {
    // 用于检查是否存在某项参数或者参数组
    for (var i = 0; i < arguments.length; i++) {
      if (util.isArray(arguments[i])) {
        if (arguments[i].every((element) => this.query[element] === undefined)) {
          this.throw412(arguments[i])
        }
      // 如果出入的某项是数组，则只要数组中的某一项不为空就通过
      } else {
        if (this.query[arguments[i]] === undefined) {
          this.throw412(arguments[i])
        }
      }
    }
  }

  this.pageLength = 16

  this.arrayQuery = function * (model, id, options, prop, index) {
    var skip = -this.pageLength / 2
    var pageLength = this.pageLength / 2
    if (index) {
      skip = Math.max(Number.parseInt(index.substr(1)) , 0)
      if (skip < 0) {
        this.throw403('index')
      }
      // 除了index为空之外不允许负数
      pageLength = this.pageLength
      if (index.charAt(0) === '>') {
        skip++
      // 由于>是大于index的内容,所以需要+1
      }
      if (index.charAt(0) === '<') {
        if (skip < pageLength) {
          pageLength = skip
        } // 最后一页如果skip比pageLength小时返回的数据无法衔接
        skip = skip - pageLength
      }
    }

    options.attributes.include.push([sequelize.fn('array_slice_id', sequelize.col(prop), skip, skip + pageLength), prop])
    var data = yield model.findById(id, options)

    if (data.dataValues[prop] == null || data.dataValues[prop].length < 0) return data
    data.dataValues[prop].reverse()

    if (index) {
      if (index.charAt(0) === '>') {
        data.dataValues.prev = '>' + (skip + data.dataValues[prop].length - 1)
      }
      if (index.charAt(0) === '<') {
        if (skip !== 0) {
          data.dataValues.next = '<' + skip
        }
      }
    } else {
      if ((data.dataValues[prop + 'Count'] - data.dataValues[prop].length) !== 0) {
        data.dataValues.next = '<' + (data.dataValues[prop + 'Count'] - data.dataValues[prop].length)
      }
      data.dataValues.prev = '>' + (data.dataValues[prop + 'Count'] - 1)
    }

    for (let i = 0; i < data.dataValues[prop].length; i++) {
      if (data.dataValues[prop][i] == null) {
        data.dataValues[prop].splice(i, 1)
        i--
      }
    }
    // 移除空值
    return data
  }
  this.listQuery = function * (model, options, prop, index) {
    options.limit = this.pageLength
    options.order = 'id DESC'

    if (index !== undefined) {
      if (index.charAt(0) === '>') {
        options.where.id = {
          gt: index.substr(1)
        }
        options.order = 'id ASC'
      } else if (index.charAt(0) === '<') {
        options.where.id = {
          lt: index.substr(1)
        }
      }
    }

    var list = yield model.findAll(options)
    var data = {}
    data[prop] = list

    if (list.length > 0) {
      if (options.order === 'id ASC') {
        list.reverse()
      }
      data.next = '<' + list[list.length - 1].id
      data.prev = '>' + list[0].id
    } else if (options.where.id.gt) {
      data.prev = this.query.index
    }

    return data
  }

  this.ListPage = function (pageing, list) {
    var relist = []
    if (pageing) {
      if (pageing.slice[0] > 0) { // 取前面的
        let l = list.length
        if (pageing.slice[1] > pageing.slice[0]) {
          pageing.slice[1] = pageing.slice[0]
        }
        if (l > pageing.slice[1]) {
          l = pageing.slice[1]
        }

        for (let i = 0; i < l; i++) {
          relist[i] = list[i]
        }
      } else { // 获取后面的
        let l = list.length
        let b = pageing.slice[0] / -1 // 游标

        if (b > l) {
          b = l
        }

        for (let i = l - b; i <= pageing.slice[1]; i++) {
          relist[i - (l - b)] = list[i]
        }
      }
      return relist
    } else {
      return list
    }
  }

  if (this.query && this.query.id) {
    if (this.query.id.length !== 16) {
      this.throw412('id')
    }
  } // 如果有id这自动验证id长度是否匹配

  try {
    yield * next
  } catch (error) {
    if (error.isMessage) {
      throw error
    } else {
      this.error(error)
      this.throw(500)
    }
  }
}
