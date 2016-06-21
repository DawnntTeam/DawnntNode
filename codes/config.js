module.exports = {
  getSQLConfig: function () {
    return 'postgres://IijU0j0j7W03NGVy:EZgtif^6OYxu$Ip$@qumaopao.c2lcbydwiw7b.rds.cn-north-1.amazonaws.com.cn:5432/qumaopao'
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
