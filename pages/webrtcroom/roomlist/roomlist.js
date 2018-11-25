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
    },


    /**
     * 切换摄像头
     */
    changeCamera: function () {
        self.data.webrtcroomComponent.switchCamera();
        self.setData({
            frontCamera: !self.data.frontCamera
        })
    },

    /**
     * 设置美颜
     */
    setBeauty: function () {
        self.data.beauty = (self.data.beauty == 0 ? 5 : 0);
        self.setData({
            beauty: self.data.beauty
        });
    },

    /**
     * 切换是否静音
     */
    changeMute: function () {
        self.data.muted = !self.data.muted;
        self.setData({
            muted: self.data.muted
        });
    },

    /**
     * 是否显示日志
     */
    showLog: function () {
        self.data.debug = !self.data.debug;
        self.setData({
            debug: self.data.debug
        });
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

                // 成功进房后发送心跳包
                self.sendHeartBeat(self.data.userID, self.data.roomID);

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
     * 进入推流房间
     */
    enterRoom: function () {
        webrtcroom.enterRoom(self.data.userID, self.data.roomID,
            function (res) {

                // 成功进房后发送心跳包
                self.sendHeartBeat(self.data.userID, self.data.roomID);

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
                console.error(self.data.ERROR_CREATE_ROOM, '进入房间失败[' + res.errCode + ';' + res.errMsg + ']')
                self.onRoomEvent({
                    detail: {
                        tag: 'error',
                        code: -999,
                        detail: '进入房间失败[' + res.errCode + ';' + res.errMsg + ']'
                    }
                })
            });
    },

    /**
     * 发送心跳包
     */
    sendHeartBeat(userID, roomID) {
        // 发送心跳
        webrtcroom.startHeartBeat(userID, roomID, function (res) {
            console.log('心跳成功');
            switch(res.data.code){
                case '0': break;
                case '1':
                    break;
                default:
            }
            self.data.heartBeatFailCount = 0;
        }, function () {
            self.data.heartBeatFailCount++;
            // wx.navigateTo({
            //   url: '../roomlist/roomlist'
            // });
            // 2次心跳都超时，则认为真正超时了
            if (self.data.heartBeatFailCount > 3) {
                wx.hideToast();
                wx.showToast({
                    icon: 'none',
                    title: '连接超时，请重新进入房间',
                    complete: function () {
                        setTimeout(() => {
                            self.goBack();
                        }, 1000);
                    }
                });
            } else {
                wx.hideToast();
                if(self.data.heartBeatFailCount > 2){
                    wx.showToast({
                        icon: 'none',
                        title: '连接超时，正在重试...'
                    });
                }
            }
        });
    },

    /**
     * 返回上一页
     */
    goBack() {
        var baseURL = "https://qfkj.jiankanghebei.com/inquiry_server/mzCommon/clinicChat/";
        var room = app.globalData.userType=="doctor"?("doctorToRoom/"+self.data.doctorId):"patientToRoom";
        var clinicRoomURL = baseURL + room + "/" + self.data.orderId;
        if(app.globalData.userType == "doctor"){
            wx.reLaunch({
                url: "/pages/index/index?clinicRoomURL=" + clinicRoomURL
            })
        }else{
            webrtcroom.quitRoom(self.data.userID, self.data.roomID);
            wx.showModal({
                title:"您已退出房间",
                content:"请点击右上角按钮退出小程序"
            })
        }
    },

    /**
     * 进入房间
     */
    joinRoom() {
        console.log('room.js onLoad');
        var time = new Date();
        time = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
        console.log('*************开始视频问诊：' + time + '**************');

        // webrtcComponent
        self.data.webrtcroomComponent = self.selectComponent('#webrtcroom');
        /*wx.showToast({
            icon: 'none',
            title: '获取登录信息中'
        });*/
        webrtcroom.getLoginInfo(
            self.data.userID,
            function (res) {
                self.data.userID = res.data.userID;
                wx.setStorageSync('webrtc_room_userid', self.data.userID);

                self.data.sdkAppID = res.data.sdkAppID;
                self.data.userSig = res.data.userSig;

                if (self.data.createOrEnter == "enter") {
                    self.enterRoom();
                } else {
                    self.createRoom();
                }
            },
            function (res) {
                wx.showToast({
                    icon: 'none',
                    title: '获取登录信息失败，请重试',
                    complete: function () {
                        setTimeout(() => {
                            self.goBack();
                        }, 1500);
                    }
                });
            });
    },

    /**
     * 版本对比
     * @param v1
     * @param v2
     * @returns {number}
     */
    compareVersion: function (v1, v2) {
        v1 = v1.split('.')
        v2 = v2.split('.')
        var len = Math.max(v1.length, v2.length)

        while (v1.length < len) {
            v1.push('0')
        }
        while (v2.length < len) {
            v2.push('0')
        }

        for (var i = 0; i < len; i++) {
            var num1 = parseInt(v1[i])
            var num2 = parseInt(v2[i])

            if (num1 > num2) {
                return 1
            } else if (num1 < num2) {
                return -1
            }
        }

        return 0
    },

    /**
     * 不支持在线视频提示
     * @param options
     */
    unsupportedSug: function(){
        wx.showModal({
            title: '提示',
            content: "当前微信版本不支持在线视频功能，请使用6.6.6以上的版本",
            showCancel: false,
            complete: function () {
                wx.navigateBack({
                    delta : 1
                })
            }
        })
    },

    getRoomList: function () {
        webrtcroom.getRoomList(0, 20, function (res) {
            var isRoomCreated = false;
            var targetRoom;
            console.log('拉取房间列表成功:', res);
            if (res.data && res.data.rooms) {
                self.setData({
                    roomList: res.data.rooms
                });
                var rooms = self.data.roomList;
                if(rooms.length == 0){
                    self.setData({createOrEnter:'create'});
                } else {
                    for(var i=0;i<rooms.length;i++){
                        if(rooms[i].roomInfo == self.data.roomname){
                            isRoomCreated = true;
                            targetRoom = rooms[i];
                        }
                    }
                    if(isRoomCreated){
                        self.setData({
                            createOrEnter:'enter',
                            roomID:targetRoom.roomID
                        });
                    }else{
                        self.setData({createOrEnter:'create'});
                    }
                }
                console.log("111111111111111111");
                console.log(app.globalData.userType);
                self.joinRoom();
            }
        }, function (res) {
            wx.showToast({
                icon: 'none',
                title: '拉取视频房间失败，请稍后再试',
                complete: function(){
                    setTimeout(() => {
                        self.goBack();
                    }, 1500);
                }
            })
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
        //还原初始设置
        if(self.data.roomID&&self.data.userID){
            webrtcroom.quitRoom(self.data.userID, self.data.roomID);
        }
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
     * 患者登陆
     * @param options
     */
    patientOnLoad: function (options) {
        console.log(options);
        var orderId = decodeURIComponent(options.scene);
        if(!orderId){
            self.guestOnLoad();
        }
        wx.request({
            url:"https://qfkj.jiankanghebei.com/inquiry_server/mzCommon/clinicChat/getOrderDetail",
            data:{orderNo: orderId},
            success: function(res){
                console.log(res);
                var res = res.data;
                if(res.code == 0){
                    //服务器当前时间
                    var serverTime = Date.parse(res.data.nowDate.replace(/-/g,"/")+"+08:00");
                    //获取到期时间
                    var remainTime = parseInt(res.data.remainTime) * 1000;
                    if(res.data.relieveHangUpTime){
                        var relieveHangUpTime = Date.parse(res.data.relieveHangUpTime.replace(/-/g,"/")+"+08:00");
                        var dueTimeStamp = parseInt(relieveHangUpTime) + remainTime;
                    }else if(res.data.receiveOrderTime){
                        var receiveOrderTime = Date.parse(res.data.receiveOrderTime.replace(/-/g,"/")+"+08:00");
                        var dueTimeStamp = parseInt(receiveOrderTime) + remainTime;
                    } else{
                        var dueTimeStamp = serverTime + remainTime;
                    }
                    var clientTime = new Date().getTime();
                    app.globalData.timeDeviation = serverTime - clientTime;
                    console.log(app.globalData.timeDeviation);
                    console.log(dueTimeStamp);
                    console.log(serverTime)
                    //订单已到期
                    if(dueTimeStamp<serverTime){
                        console.log("---------过期---------")
                        app.globalData.userType = "guest"
                        wx.showToast({
                            title: "二维码已过期",
                            duration:3000,
                            complete: function(){
                                setTimeout(() => {
                                    self.guestOnLoad();
                                }, 3000);
                            }
                        });
                    } else{
                        self.setData({
                            userID: wx.getStorageSync('webrtc_room_userid'),
                            patientId: res.data.patientId,
                            roomname: res.data.doctorId + res.data.patientId,
                            username: res.data.patientId,
                            dueTimeStamp: dueTimeStamp,
                            roomCreator: res.data.doctorId,
                            doctorId: res.data.doctorId,
                            orderId: orderId
                        });
                        if(app.globalData.firstLoaded){
                            app.globalData.firstLoaded = false;
                            wx.redirectTo({
                                url : '/pages/webrtcroom/preroom/preroom?scene='+orderId+'&dueTimeStamp='+dueTimeStamp
                            })
                        } else{
                            self.getRoomList();
                        }
                    }
                } else{
                    wx.showToast({
                        title: res.msg+"，请关闭小程序重试",
                        duration:3000,
                        complete: function(){
                            setTimeout(() => {
                                self.guestOnLoad();
                            }, 3000);
                        }
                    });
                }
            }
        })
    },
    /**
     * 游客的OnLoad
     * @param options
     */
    guestOnLoad: function (options) {
        if(app.globalData.isAllowFlag){
            app.globalData.userType = 'patient'
            wx.reLaunch({
                url: "/pages/index/index"
            });
            return;
        }
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
    },
    /**
     * 医生登陆代码
     */
    doctorOnLoad: function(options){
        //doctorId,orderId是必须要被设置的参数
        app.globalData.orderId = options.orderId;
        app.globalData.doctorId = options.doctorId;
        self.setData({
            userID: wx.getStorageSync('webrtc_room_userid'),
            patientId: options.patientId,
            roomname: options.doctorId + options.patientId,
            username: options.type == "doctor" ? options.doctorId : options.patientId,
            dueTimeStamp: options.dueTimeStamp,
            roomCreator: options.doctorId,
            doctorId: options.doctorId,
            orderId: options.orderId
        });
        app.globalData.timeDeviation = options.timeDeviation ? options.timeDeviation : 0;
        if(app.globalData.doctorFirstLoaded){
            app.globalData.doctorFirstLoaded = false;
            var url = '/pages/webrtcroom/preroom/preroom?';
            url += "doctorId=" + options.doctorId;
            url += "&patientId=" + options.patientId;
            url += "&dueTimeStamp=" + options.dueTimeStamp;
            url += "&orderId=" + options.orderId;
            url += "&timeDeviation=" + options.timeDeviation;
            url += "&type=" + options.type;
            console.log(url);
            console.log("************************");
            wx.redirectTo({
                url : url
            })
        } else{
            self.getRoomList();
        }
    },
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        self = this;
        app.globalData.currentPage = self;
        app.globalData.hasEnteredVedioRoom = true;
        self.setData({ navH: app.globalData.navHeight})
        var systemInfo = wx.getSystemInfoSync();
        console.log(systemInfo);
        if(self.compareVersion(systemInfo.version, '6.6.2') < 0) {
            self.unsupportedSug();
        } else{
            if(app.globalData.userType=="doctor"){
                self.doctorOnLoad(options);
            } else{
                //添加回调保证配置信息一定被加载到
                if(app.globalData.doctorURL){
                    if(app.globalData.userType=="patient"){
                        self.patientOnLoad(options)
                    } else{
                        self.guestOnLoad(options)
                    }
                } else{
                    app.configCallBack = (doctorURL)=>{
                        console.log("===============callback============");
                        if(doctorURL){
                            if(app.globalData.userType=="patient"){
                                self.patientOnLoad(options)
                            } else{
                                self.guestOnLoad(options)
                            }
                        }
                    }
                }
            }
        }
    },
})