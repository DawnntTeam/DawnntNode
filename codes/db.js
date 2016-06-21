﻿// TODO:关于getterMethods方法的方案在hook中设置代替方案
'use strict'
const config = require('./config')

process.env['BLUEBIRD_DEBUG'] = 0
var Sequelize = require('sequelize')
var sequelize = new Sequelize(config.getSQLConfig(), {
  define: {
    freezeTableName: true,
    timestamps: false
  }
})

var exprots = {}
sequelize.addHook('beforeDefine', function (attributes, options) {
  if (!(options.hasOwnProperty('noid') && options.noid === true)) {
    // 如果带有noid则不需要添加id列
    var temp = {}
    for (let key in attributes) {
      temp[key] = attributes[key]
      delete attributes[key]
    }
    attributes.id = {
      type: Sequelize.BIGINT(16),
      allowNull: false,
      primaryKey: true,
      defaultValue: function () {
        return Date.now() * 1000
      }
    }
    for (let key in temp) {
      attributes[key] = temp[key]
    }
  // 用于调整id在列中的顺序排第一
  }
})

sequelize.addHook('afterFind', function (attributes, options) {
  if (options && options.hasOwnProperty('population') && typeof options.population === 'object') {
    if (Array.isArray(options.population)) {
      var promises = []
      options.population.forEach(function (population) {
        var findOptions = buildOptions(attributes, population)
        if (findOptions) {
          var model = sequelize.models[population.model]
          if (Array.isArray(attributes)) {
            let a = model.findAll(findOptions).then(function (result) {
              buildData(result, attributes.map((item) => item.dataValues), population.col)
            })
            promises.push(a)
          } else {
            let a = model.findAll(findOptions).then(function (result) {
              buildData(result, attributes.dataValues, population.col)
            })
            promises.push(a)
          }
        }
      })
      return Sequelize.Promise.all(promises)
    } else {
      var findOptions = buildOptions(attributes, options.population)
      if (findOptions) {
        var model = sequelize.models[options.population.model]
        if (Array.isArray(attributes)) {
          if (attributes.length > 0) {
            return model.findAll(findOptions).then(function (result) {
              buildData(result, attributes.map((item) => item.dataValues), options.population.col)
            })
          }
        } else {
          return model.findAll(findOptions).then(function (result) {
            buildData(result, attributes.dataValues, options.population.col)
          })
        }
      }
    }
  }
})

function buildOptions (attributes, population) {
  var findOptions = {
    where: {
      id: []
    }
  }
  if (population.population) {
    findOptions.population = population.population
  }
  if (Array.isArray(attributes)) {
    attributes.forEach(function (attr) {
      if (Array.isArray(getValue(attr.dataValues, population.col))) {
        findOptions.where.id.push.apply(findOptions.where.id, getValue(attr.dataValues, population.col))
      } else {
        findOptions.where.id.push(getValue(attr.dataValues, population.col))
      }
    })
  } else {
    if (Array.isArray(getValue(attributes.dataValues, population.col))) {
      findOptions.where.id.push.apply(findOptions.where.id, getValue(attributes.dataValues, population.col))
    } else {
      findOptions.where.id.push(getValue(attributes.dataValues, population.col))
    }
  }
  if (findOptions.where.id.length !== 0) {
    findOptions.where.id = Array.from(new Set(findOptions.where.id))
    if (findOptions.where.id.all(undefined)) {
      findOptions = null
    }
  } else {
    findOptions = null
  }
  return findOptions
}

function buildData (result, data, col) {
  var resultMap = new Map()
  result.forEach(function (res) {
    resultMap[res.id] = res
  })
  if (Array.isArray(data)) {
    if (col) {
      for (let i = 0; i < data.length; i++) {
        setValue(data[i], col, resultMap[getValue(data[i], col)])
      }
    } else {
      setValue(data, col, resultMap[getValue(data, col)])
    }
  } else {
    if (Array.isArray(getValue(data, col))) {
      for (let i = 0; i < getValue(data, col).length; i++) {
        getValue(data, col)[i] = resultMap[getValue(data, col)[i]]
      }
    } else {
      setValue(data, col, resultMap[getValue(data, col)])
    }
  }
}

function getValue (data, col) {
  if (Array.isArray(col)) {
    for (var i = 0; i < col.length - 1; i++) {
      data = data[col[i]]
    }
    return data[col[i]]
  } else {
    return data[col]
  }
}
function setValue (data, col, value) {
  if (Array.isArray(col)) {
    for (var i = 0; i < col.length - 1; i++) {
      data = data[col[i]]
    }
    data[col[i]] = value
  } else {
    data[col] = value
  }
}
exprots.sequelize = sequelize

exprots.User = sequelize.define('user', {
  name: {
    type: Sequelize.STRING
  },
  sex: {
    type: Sequelize.ENUM,
    values: ['male', 'female', 'neutral']
  },
  phone: {
    type: Sequelize.STRING
  },
  email: {
    type: Sequelize.STRING
  },
  head: {
    type: Sequelize.STRING
  },
  birthday: {
    type: Sequelize.DATEONLY
  },
  desc: {
    type: Sequelize.STRING
  },
  location: {
    type: Sequelize.STRING
  },
  cover: {
    type: Sequelize.STRING
  }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})
exprots.Status = sequelize.define('status', {
  longitude: {
    type: Sequelize.DECIMAL
  },
  latitude: {
    type: Sequelize.DECIMAL
  },
  content: {
    type: Sequelize.STRING
  },
  user: {
    type: Sequelize.BIGINT
  },
  photo: {
    type: Sequelize.ARRAY(Sequelize.BIGINT)
  }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})

exprots.Comment = sequelize.define('comment', {
  longitude: {
    type: Sequelize.DECIMAL
  },
  latitude: {
    type: Sequelize.DECIMAL
  },
  content: {
    type: Sequelize.STRING
  },
  user: {
    type: Sequelize.BIGINT
  },
  status: {
    type: Sequelize.BIGINT
  },
  target: {
    type: Sequelize.BIGINT
  }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})

exprots.Notice = sequelize.define('notice', {
  type: {
    type: Sequelize.STRING
  }, // relation commnet
  state: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }, // 状态 已读 未读
  user: {
    type: Sequelize.BIGINT
  }, // 用户
  targetUser: {
    type: Sequelize.BIGINT
  }, // 目标用户
  option: {
    type: Sequelize.JSONB
  }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})

exprots.Bubblemap = sequelize.define('bubblemap', {
  map: {
    type: Sequelize.STRING
  }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})
exprots.Bubblemap.hasOne(exprots.Status, { foreignKey: 'id' })

exprots.PhoneUser = sequelize.define('phoneuser', {
  phone: {
    type: Sequelize.STRING
  }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})

exprots.WechatUser = sequelize.define('wechatUser', {
  openid: { type: Sequelize.STRING },
  accessToken: { type: Sequelize.STRING },
  refreshToken: { type: Sequelize.STRING },
  token: { type: Sequelize.STRING }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})

exprots.Token = sequelize.define('token', {
  token: { type: Sequelize.STRING },
  user: { type: Sequelize.BIGINT },
  last: { type: Sequelize.DATE, defaultValue: Date.now }
}, {
  getterMethods: {
    create_at: function () {
      return new Date(this.id / 1000)
    }
  }
})

exprots.MemoryCache = sequelize.define('memoryCache', {
  key: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
  value: {type: Sequelize.STRING},
  expires: { type: Sequelize.DATE }
}, {noid: true})

exprots.PhoneCode = sequelize.define('phoneCode', {
  phone: { type: Sequelize.STRING },
  code: { type: Sequelize.STRING }
}, {
  getterMethods: {
    create_at: function () { return new Date(this.id / 1000) }
  }
})

module.exports = exprots
