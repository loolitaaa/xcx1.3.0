// pages/index/index.js
var app = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        code:'',
        isReturnFromVedio: false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        self = this;
        if(options&&options.clinicRoomURL){
            self.data.isReturnFromVedio = true;
            wx.navigateTo({
                url: "/pages/webview/webview" + "?clinicRoomURL=" + options.clinicRoomURL,
            })
        }
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        if(self.data.isReturnFromVedio){
            self.data.isReturnFromVedio = false;
        }else{
            if(app.globalData.userType == "doctor"){
                self.doctorLogin();
            }else{
                wx.navigateTo({
                    url: "/pages/webview/webview",
                })
            }
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
        app.globalData.isIndexLoaded = false;
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
     * 医生端的登陆入口
     */
    doctorLogin : function(){
        //如果已经获取过code，直接跳转
        if(app.globalData.doctorCode){
            wx.navigateTo({
                url: "/pages/webview/webview",
            })
        }
        //医生在企业微信登陆需要获取code
        wx.qy.login({
            success: function(res){
                if(res.code){
                    app.globalData.doctorCode = res.code;
                    self.setData({code:res.code})
                    console.log(res);
                    //添加一个回调函数保证小程序获得code之后再加载网页
                    if(app.codeCallback){
                        app.codeCallback(res.code);
                    }
                }else{
                    //获取不到code提示用户重新打开小程序
                    wx.showToast({
                        title: '验证失败,请重新打开小程序',
                        icon: 'none',
                        duration: 2000
                    })
                }
            },
            fail: function (){
                wx.showToast({
                    title: '验证失败,请重新打开小程序',
                    icon: 'none',
                    duration: 2000
                })
            }
        });
        if(app.globalData.doctorCode){
            wx.navigateTo({
                url: "/pages/webview/webview",
            })
        } else {
            app.codeCallback = doctorCode=>{
                if(doctorCode){
                    console.log(doctorCode)
                    app.globalData.doctorCode = doctorCode;
                    wx.navigateTo({
                        url: "/pages/webview/webview",
                    })
                }
            }
        }
    }
})