//app.js

var qcloud = require('./lib/index');
const timer = require('./utils/wxTimer.js');

App({
    onLaunch: function (options) {
        console.log("-------------app.onLaunch-----------");
        console.log(options);
        this.userTypeConfig(options);
        this.checkUpdate();
        this.getMiniProConfig();
    },

    /**
     * 检查版本更新
     */
    checkUpdate : function(){
        console.log("------------doCheckUpdate----------")
        // 获取小程序更新机制兼容
        if (wx.canIUse('getUpdateManager')) {
            const updateManager = wx.getUpdateManager()
            updateManager.onCheckForUpdate(function (res) {
                // 请求完新版本信息的回调
                if (res.hasUpdate) {
                    updateManager.onUpdateReady(function () {
                        wx.showModal({
                            title: '更新提示',
                            content: '新版本已经准备好，是否重启应用？',
                            success: function (res) {
                                if (res.confirm) {
                                    // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                                    updateManager.applyUpdate()
                                }
                            }
                        })
                    })
                    updateManager.onUpdateFailed(function () {
                        // 新的版本下载失败
                        wx.showModal({
                            title: '已经有新版本了哟~',
                            content: '新版本已经上线啦~，请您删除当前小程序，重新搜索打开哟~',
                        })
                    })
                }
            })
        } else {
            // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
            wx.showModal({
                title: '提示',
                content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
            })
        }
    },

    /**
     * 为用户分配身份
     */
    userTypeConfig: function(options){
        console.log(options)
        var systemInfo = wx.getSystemInfoSync();
        console.log(systemInfo);
        this.globalData.navHeight = systemInfo.statusBarHeight + 46;
        //从企业微信进入视为医生
        if(systemInfo.environment&&systemInfo.environment == "wxwork"){
            this.globalData.userType = 'doctor';
        } else{
            //扫码进入标记为患者,其他途径视为游客
          if (options.scene && (options.scene==1011||options.scene==1012||options.scene==1013||options.scene==1043||options.scene==1047||options.scene==1048||options.scene==1049)){
                this.globalData.userType = 'patient';
            }else{
                this.globalData.userType = 'guest';
            }
        }
    },
    /**
     * 获取小程序配置信息
     */
    getMiniProConfig: function(){
        self = this;
        wx.request({
            url:"https://wechat.jiankanghebei.com/inquiry_server/xcx/getConfig",
            success: function(res){
                var resData = res.data;
                console.log(resData);
                if(!resData.xcxVersion){
                    if(self.globalData.failCount<3){
                        self.globalData.failCount++;
                        self.getMiniProConfig();
                    } else{
                        wx.showModal({
                            title: '获取配置信息失败',
                            content: '请重启小程序',
                        })
                    }
                } else {
                    self.globalData.failCount = 0;
                    self.globalData.doctorURL = resData.doctorUrl;
                    self.globalData.patientURL = resData.patientUrl;
                    self.globalData.guestURL = resData.guestUrl;
                    self.globalData.isAllowFlag = resData.allowFlag;
                    self.globalData.welcomePageFlag = resData.welcomePageFlag;
                }
                if(self.configCallBack){
                    self.configCallBack(resData.doctorUrl)
                }
            },
            fail: function(){
                if(self.globalData.failCount<3){
                    self.globalData.failCount++;
                    self.getMiniProConfig();
                } else{
                    wx.showModal({
                      title: '服务器繁忙',
                      content: '请稍后再试',
                    })
                }        
            }
        })
    },

    globalData: {
        userInfo: null,
        firstLoaded:true,//记录小程序是否是第一次被加载
        scene:'',
        navHeight: 0,//自定义的导航栏高度
        userType: '',
        patientURL: "",//患者主页
        doctorURL: "",//医生主页
        guestURL: "",//游客主页
        isAllowFlag: "",//非法用户处理策略
        welcomePageFlag: '',//是否使用欢迎页
        webviewURL: '',
        wxTimer: new timer(),//定时器组件
        navHeight: 0,
        timeDeviation: 0, //记录客户端与服务端的时间偏差，默认为 0
        doctorCode: '',
        hasEnteredVedioRoom: false,//记录是否进入房间，用于判断webview.onshow事件触发的状态
        orderId: "",//订单id
        doctorId: "",//医生Id
        failCount: 0,//记录获取配置信息失败次数
        currentPage: '',//记录当前页面
        doctorFirstLoaded: true
    }
})