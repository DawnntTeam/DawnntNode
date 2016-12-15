module.exports = {
  getSQLConfig: function () {
    return {
      database: 'qumaopao',
      username: 'postgres',
      password: 'fan4ren#dawnnt',
      host: '112.74.26.67',
    }
    // return 'postgres://postgres:fan4ren#dawnnt@112.74.26.67:5432/qumaopao'
  },
  getWechatConfig: function () {
    return {
      appid: 'wxf7129b56ed54f871',
      secret: '0bf5ef34337856b2eb9e72dbbcffc9fb'
    }
  },
  getQiniuConfig: function () {
    return {
      accessKey: 'w8wLk3Bx4BmVSz2tCG6gRTTyiCGiSnIMqYvMvMiM',
      secretKey: 'YZ7q2mpTywxLFRm31H9fnfmtyY1eS8JRuccFq9oI',
      host: 'static.qumaopao.com',
      storage: 'qumaopao'
    }
  }
}
