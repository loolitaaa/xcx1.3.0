// pages/webview/webview.js
var app = getApp()

Page({

    /**
     * 页面的初始数据
     */
    data: {
        webviewURL : '',
        hasShowed : false,
        currentPage : ''
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        self = this;
        app.globalData.currentPage = self;
        //记录是否合法进入视频界面的标志
        app.globalData.loginFromWebView = true;
        //添加回调保证配置信息一定被加载到
        if(app.globalData.doctorURL){
            self.doOnLoad(options);
        } else{
            app.configCallBack = doctorURL=>{
                if(doctorURL){
                    app.globalData.currentPage.doOnLoad(options);
                }
            }
        }
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     * 从视频页面返回webview页面有两种触发方式，第一种是由挂断按钮触发
     * 第二种是点击导航栏返回键，onshow 事件中要处理第二种方式
     */
    onShow: function () {
        app.globalData.loginFromWebView = true;
        if(app.globalData.hasEnteredVedioRoom){
            var baseURL = "https://qfkj.jiankanghebei.com/inquiry_server/mzCommon/clinicChat/";
            var room = app.globalData.userType=="doctor"?("doctorToRoom/"+app.globalData.doctorId):"patientToRoom";
            var clinicRoomURL = baseURL + room + "/" + app.globalData.orderId;
            //数据时用过一次之后需要清空
            app.globalData.hasEnteredVedioRoom = false;
            app.globalData.doctorId = '';
            app.globalData.orderId = '';
            wx.reLaunch({
                url: "/pages/index/index?clinicRoomURL=" + clinicRoomURL
                //url: "/pages/index/index"
            })
        }
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 网页加载成功触发该时间
     */
    pageOnLoad : function (e) {
        console.log(e.detail.src)
        self.setData({
            currentPage : e.detail.src
        })
    },
    /**
     * 网页加载失败触发该时间
     */
    pageError : function (e) {
        console.log(e);
        self.setData({
            webviewURL : self.data.currentPage
        })
    },
    /**
     * 抽取onLoad代码
     */
    doOnLoad: function(options){
        //options.clinicRoomURL说明是从视频界面返回，重新加载聊天页面
        if(options&&options.clinicRoomURL){
            self.setData({
                webviewURL: options.clinicRoomURL,
            })
            //app.globalData.doctorCode = '';
        }else{
            //根据用户类型不同，分配相应的地址
            if(app.globalData.userType == "patient"){
                self.guestOnLoad();
            }else if(app.globalData.userType == "doctor"){
                self.setData({
                    webviewURL: app.globalData.doctorURL + "?code=" + app.globalData.doctorCode,
                })
                //app.globalData.doctorCode = '';
            }else{
                self.guestOnLoad();
            }
            console.log(this.data.webviewURL);
        }
    },

    /**
     * 游客的OnLoad
     * @param options
     */
    guestOnLoad: function (options) {
        if(app.globalData.isAllowFlag){
            app.globalData.userType = 'patient'
            self.setData({
                webviewURL: app.globalData.patientURL
            })
        }else{
            app.globalData.userType = "guest";
            if(app.globalData.welcomePageFlag){
                wx.reLaunch({
                    url: "/pages/forguests/forguests"
                })
            } else{
                wx.showModal({
                    title:"权限验证失败",
                    content:"请点击右上角按钮退出小程序"
                })
            }
        }
    },
})