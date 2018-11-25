var webrtcroom = require('../../../utils/webrtcroom.js')

var app = getApp()

Page({
    /**
     * 页面的初始数据
     * 应注意：userID为服务端随机生成，userName对应上一页面传过来的userId
     */
    data: {
        roomList: [],
        doctorId: '',
        patientId: '',
        createOrEnter: '',
        navHeight: 0,//自定义的导航栏宽度
        webrtcroomComponent: null,
        roomID: '', // 房间id
        roomname: '', // 房间名称
        beauty: 0,
        muted: false,
        debug: false,
        frontCamera: true,
        userID: '',
        userSig: '',
        sdkAppID: '',
        roomCreator: '',
        comment: [],
        toview: null,
        isErrorModalShow: false,
        heartBeatFailCount: 0, //心跳失败次数
        autoplay: true,
        enableCamera: true,
        dueTimeStamp:0
    },

    /**
     * 创建房间
     * 房间创建成功后，发送心跳包，并启动webrtc-room标签
     */
    createRoom: function () {
        webrtcroom.createRoom(self.data.userID, self.data.roomname,
            function (res) {
                console.log('创建房间成功:', res);
                self.data.roomID = res.data.roomID;
                // 设置webrtc-room标签中所需参数，并启动webrtc-room标签
                self.setData({
                    userID: self.data.userID,
                    userSig: self.data.userSig,
                    sdkAppID: self.data.sdkAppID,
                    roomID: self.data.roomID,
                    privateMapKey: res.data.privateMapKey
                }, function () {
                    self.data.webrtcroomComponent.start(self,self.data.dueTimeStamp);
                })
            },
            function (res) {
                console.error('创建房间失败[' + res.errCode + ';' + res.errMsg + ']');
                self.onRoomEvent({
                    detail: {
                        tag: 'error',
                        code: -999,
                        detail: '创建房间失败[' + res.errCode + ';' + res.errMsg + ']'
                    }
                })
            });
    },

    /**
     * 进入房间
     */
    joinRoom() {
        console.log('*************开始视频问诊**************');
        wx.showToast({
            icon: 'none',
            title: '获取登录信息中'
        });
        // webrtcComponent
        self.data.webrtcroomComponent = self.selectComponent('#webrtcroom');
        webrtcroom.getLoginInfo(
            self.data.userID,
            function (res) {
                wx.setStorageSync('webrtc_room_userid', self.data.userID);
                self.setData({
                    useID: res.data.userID,
                    sdkAppID: res.data.sdkAppID,
                    userSig: res.data.userSig
                })
                self.createRoom();
            });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {
        // 设置房间标题
        wx.setNavigationBarTitle({
            title: '视频问诊'
        });
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
        console.log('room.js onShow');
        // 保持屏幕常亮
        wx.setKeepScreenOn({
            keepScreenOn: true
        })
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {
        console.log('room.js onHide');
    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        console.log('room.js onUnload');
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
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        self = this;
        self.setData({
            userID: wx.getStorageSync('webrtc_room_userid'),
            patientId: "test"+parseInt(100*Math.random()),
            roomname: "test"+parseInt(100*Math.random()),
            dueTimeStamp: options.dueTimeStamp,
            doctorId: "test"+parseInt(100*Math.random()),
        });
        self.setData({
            roomCreator: self.data.doctorId,
        });
        console.log(self.data.userID)
        console.log(self.data.patientId)
        console.log(self.data.dueTimeStamp)
        console.log(self.data.doctorId)
        console.log(self.data.roomname)
        self.joinRoom();
        if(app.globalData.userType=="patient") {
            setTimeout(function(){
                wx.redirectTo({
                    url:"/pages/webrtcroom/roomlist/roomlist?scene="+options.scene
                })
            },3999);
        } else{
            var url = "/pages/webrtcroom/roomlist/roomlist?";
            url += "doctorId=" + options.doctorId;
            url += "&patientId=" + options.patientId;
            url += "&dueTimeStamp=" + options.dueTimeStamp;
            url += "&orderId=" + options.orderId;
            url += "&timeDevition=" + options.timeDeviation;
            url += "&type=" + options.type;
            console.log(url);
            setTimeout(function(){
                console.log("**************redirectTo room******************")
                wx.redirectTo({
                    url: url
                })
            },3999)
            wx.showToast({
                title: '第一次加载时间较长，请耐心等待',
                icon: 'none',
                duration: 4000
            })
        }
    },
    /**
     * 监听房间事件
     */
    onRoomEvent: function (e) {
        switch (e.detail.tag) {
            case 'error':
                if (self.data.isErrorModalShow) {
                    return;
                }
                if (e.detail.code === -10) { // 进房失败，一般为网络切换的过程中
                    self.data.isErrorModalShow = true;
                    wx.showModal({
                        title: '提示',
                        content: e.detail.detail,
                        confirmText: '重试',
                        cancelText: '退出',
                        success: function (res) {
                            self.data.isErrorModalShow = false
                            if (res.confirm) {
                                self.joinRoom();
                            } else if (res.cancel) { //
                                self.goBack();
                            }
                        }
                    });
                } else {
                    // 在房间内部才显示提示
                    console.error("error:", e.detail.detail);
                    var pages = getCurrentPages();
                    console.log(pages, pages.length, pages[pages.length - 1].__route__);
                    if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/webrtcroom/room/room')) {
                        self.data.isErrorModalShow = true;
                        wx.showModal({
                            title: '提示',
                            content: e.detail.detail,
                            showCancel: false,
                            complete: function () {
                                self.data.isErrorModalShow = false
                                pages = getCurrentPages();
                                if (pages.length > 1 && (pages[pages.length - 1].__route__ == 'pages/webrtcroom/roomlist/roomlist')) {
                                    wx.showToast({
                                        title: `code:${e.detail.code} content:${e.detail.detail}`
                                    });
                                    wx.navigateBack({
                                        delta: 1
                                    });
                                }
                            }
                        });
                    }
                }
                break;
        }
    }
})