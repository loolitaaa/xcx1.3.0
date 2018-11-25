const CONSTANT = require('./config.js');
var app = getApp();
Component({
    properties: {
        roomID: {
            type: Number,
            value: 0
        },
        userID: {
            type: String,
            value: ''
        },
        userName: {
            type: String,
            value: ''
        },
        userSig: {
            type: String,
            value: ''
        },
        sdkAppID: {
            type: Number,
            value: 0,
        },
        privateMapKey: {
            type: String,
            value: ''
        },

        aspect: {
            type: String,
            value: '9:16'
        }, //设置画面比例，取值为'3:4'或者'9:16'
        minBitrate: {
            type: Number,
            value: 400
        }, //设置码率范围为[minBitrate,maxBitrate]，四人建议设置为200~400
        maxBitrate: {
            type: Number,
            value: 800
        },
        muted: {
            type: Boolean,
            value: false
        }, //设置推流是否静音
        debug: {
            type: Boolean,
            value: false
        }, //是否显示log

        // 房间的创建者
        roomCreator: {
            type: String,
            value: ''
        },

        // 进入房间后是否自动播放房间中其他的远程画面
        autoplay: {
            type: Boolean,
            value: false
        },

        enableCamera: {
            type: Boolean,
            value: true
        },

        pureAudioPushMod: {
            type: Number,
            value: 0
        },

        recordId: {
            type: Number,
            value: null
        },

        dueTimeStamp:{
            type: Number,
            value:0
        }
        // frontCamera: {type: Boolean, value: true, observer: function (newVal, oldVal) { this.switchCamera(); }},  //设置前后置摄像头，true表示前置
    },
    data: {
        navH:0,
        requestSigFailCount: 0,
        CONSTANT, // 常量
        pusherContext: '',
        playerContext:'',
        hasPushStarted: false,
        pushURL: '',
        hasExitRoom: true,
        // 记录live-player的声音状态， 默认都是打开声音状态(false和undefined)
        playerMutedStatus: false,

        // 记录live-player的摄像头状态， 默认都是打开声音状态（true和undefined）
        playerVideoStatus: true,

        ERROR_OPEN_CAMERA: -4, //打开摄像头失败
        ERROR_OPEN_MIC: -5, //打开麦克风失败
        ERROR_PUSH_DISCONNECT: -6, //推流连接断开
        ERROR_CAMERA_MIC_PERMISSION: -7, //获取不到摄像头或者麦克风权限
        ERROR_EXCEEDS_THE_MAX_MEMBER: -8, // 超过最大成员数
        ERROR_REQUEST_ROOM_SIG: -9, // 获取房间SIG错误
        ERROR_JOIN_ROOM: -10, // 进房失败
        currentPusher:{},//当前推流
        wxTimerList:{},//计时器列表
        wxTimer:null,
        hours: 0,
        minutes: 0,
        seconds: 0,
        room: null,//webRTCRoom对象，用于房间的退出
        hasPlayed: false, //是否已启动播放的标志，用于收到-2301状态码后的判断
        accelerateURL: ''
    },

    ready: function () {
        self = this;
        if (!this.data.pusherContext) {
            this.data.pusherContext = wx.createLivePusherContext('rtcpusher');
        }
        if(!this.data.playerContext){
            self.data.playerContext = wx.createLivePlayerContext("rtcplayer");
            console.log("++++++++++++++++++++++++",self.data.playerContext)
            self.data.playerContext&&self.data.playerContext.stop();
            console.log("++++++++++++++++++++++++playerContext.stop+++++++++++")
        }
    },

    detached: function () {
        self.exitRoom();
    },
    attached() {
        self = this;
        self.setData({
            navH: app.globalData.navHeight
        })
    },
    methods: {
        /**
         * 初始化布局，当template改变时
         * @param {*} templateName
         */


        /**
         * 打开或者关闭某一路画面
         * @param {Boolean} enable
         * @param {String}  operationCode = 0 代表打开或关闭本地的摄像头画面
         */
        enableVideo(enable, operationCode) {
            if (operationCode) {
                var playerContext = self.data.playerContext;
                if (playerContext) {
                    // 获取用户视频状态，默认是播放用户视频， true 播放   false 不播放
                    var videoStatus = this.data.playerVideoStatus;
                    // 如果 enable = true（想要打开画面）
                    if (enable) {
                        if (videoStatus) {
                            // 如果原来是打开状态，则不需要操作了
                        } else {
                            // 如果原来是关闭状态，则打开
                            playerContext.play();
                            var playerVideoStatus = this.data.playerVideoStatus;
                            playerVideoStatus = true; // 设置为打开状态
                            this.setData({
                                playerVideoStatus: playerVideoStatus
                            })
                        }
                    } else { // 想关闭画面
                        if (videoStatus) {
                            // 原来是打开状态，则关闭
                            // playerContext.stop();
                            var playerVideoStatus = this.data.playerVideoStatus;
                            playerVideoStatus = false; // 设置为关闭状态
                            this.setData({
                                playerVideoStatus: playerVideoStatus
                            })
                        } else {
                            // 原来就是关闭的，则不需要操作了
                        }
                    }
                }
            } else {
                 this.setData({
                   enableCamera: enable
                 });
            }
        },

        /**
         * 打开或者关闭某一路声音
         * @param {*} enable
         * @param {*} userid = 0 代表打开或关闭本地的麦克风声音
         */
        enableAudio(enable, operationCode, params = {}) {
            if (operationCode) {
                var playerContext = self.data.playerContext;
                if (playerContext) {
                    // 获取用户声音的状态，默认false 打开声音  true 关闭声音
                    var muted = this.data.playerMutedStatus;

                    // 如果 enable = true（想要打开声音）
                    if (enable) {
                        // 如果原来是关闭状态，则打开
                        if (muted) {
                            playerContext.mute(params);
                            var playerMutedStatus = this.data.playerMutedStatus;
                            playerMutedStatus = false; // 设置为打开状态
                            this.setData({
                                playerMutedStatus: playerMutedStatus
                            })
                        } else {
                            // 如果原来是打开状态，则不需要操作了
                        }
                    } else { // 想关闭声音
                        if (muted) {
                            // 原来就是关闭的，则不需要操作了
                        } else {
                            // 原来是打开状态，则关闭
                            playerContext.mute(params);
                            var playerMutedStatus = this.data.playerMutedStatus;
                            playerMutedStatus = true; // 设置为关闭状态
                            this.setData({
                                playerMutedStatus: playerMutedStatus
                            })
                        }
                    }
                }
            } else {
                // this.setData({
                //   muted: enable
                // });
            }
        },

        /**
         * 点击切换player的声音事件
         * @param {*} e
         */
        enableAudioTap(e) {
            var uid = e.currentTarget.dataset.uid;
            var status = this.data.playerMutedStatus;
            if (typeof status === 'undefined') {
                this.data.playerMutedStatus = false;
                status = false; // 默认是打开audio
            }

            this.enableAudio(status, uid);
        },

        /**
         * webrtc-room程序的入口
         */
        start: function (room,dueTimeStamp) {
            self = this;
            self.data.room = room;
            self.requestSigServer(self.data.userSig, self.data.privateMapKey);
            var timeInfo = self.getTimeInfo(dueTimeStamp)
            self.doTiming(timeInfo);
        },

        /**
         * 倒计时定时器
         * @param timeInfo
         */
        doTiming: function(timeInfo){
            self.setData({
                hours: self.format(timeInfo.hours),
                minutes: self.format(timeInfo.minutes),
                seconds: self.format(timeInfo.seconds)
            })
            self = this;
            const wxTimer = app.globalData.wxTimer;
            console.log(wxTimer);
            wxTimer.stop();
            wxTimer.beginTime = timeInfo.formatBeginTime;
            wxTimer.interval = 1;
            wxTimer.intervalFn = function(){
                if(timeInfo.hours||timeInfo.seconds||timeInfo.minutes){
                    if(timeInfo.seconds == 0){
                        timeInfo.seconds = 60;
                        if(timeInfo.minutes == 0){
                            timeInfo.minutes = 60;
                            self.setData({
                                hours: self.format(--timeInfo.hours)
                            })
                        }
                        self.setData({
                            minutes: self.format(--timeInfo.minutes)
                        })
                    }
                    self.setData({
                        seconds : self.format(--timeInfo.seconds)
                    })
                } else{
                    self.setData({
                        hours: self.format(timeInfo.hours),
                        minutes: self.format(timeInfo.minutes),
                        seconds: self.format(timeInfo.seconds)
                    })
                }
            }
            wxTimer.complete = function(){self.quitRoom()};
            wxTimer.start(self);
        },

        /**
         * 加零
         */
        format: function(i){
            return i<10?"0"+i:i;
        },

        /**
         * 根据到期事件戳获取剩余时间信息
         * @param dueTimeStamp
         * @returns {{formatBeginTime: string, hours: number, minutes: number, seconds: number}}
         */

        getTimeInfo: function(dueTimeStamp){
            var nowTime = new Date().getTime()+parseInt(app.globalData.timeDeviation);
            var remainingTime = dueTimeStamp-nowTime;
            if(remainingTime<0){
                self.quitRoom();
                return;
            }
            var remainingSeconds = Math.ceil(remainingTime/1000);

            var seconds = remainingSeconds%60;
            var minutes = Math.floor(remainingSeconds/60)%60;
            var hours = Math.floor(remainingSeconds/3600)

            var formatHours = hours<10?"0"+hours:hours;
            var formatMinutes = minutes<10?"0"+minutes:minutes;
            var formatSeconds = seconds<10?"0"+seconds:seconds;

            return {
                formatBeginTime:formatHours + ":" + formatMinutes + ":" + formatSeconds,
                hours: hours,
                minutes: minutes,
                seconds: seconds
            };
        },

        /**
         * 停止
         */
        stop: function () {
            self.data.hasExitRoom = true;
            console.log("组件停止");
            self.exitRoom();
        },

        /**
         * 暂停
         */
        pause: function () {
            if (!self.data.pusherContext) {
                self.data.pusherContext = wx.createLivePusherContext('rtcpusher');
            }
            self.data.pusherContext && self.data.pusherContext.pause();
            self.data.playerContext && self.data.playerContext.pause();
        },

        resume: function () {
            if (!self.data.pusherContext) {
                self.data.pusherContext = wx.createLivePusherContext('rtcpusher');
            }
            self.data.pusherContext && self.data.pusherContext.resume();
            self.data.playerContext && self.data.playerContext.resume();
        },

        /**
         * 切换摄像头
         */
        switchCamera: function () {
            console.log("------------change camera------------");
            if (!self.data.pusherContext) {
                self.data.pusherContext = wx.createLivePusherContext('rtcpusher');
            }
            self.data.pusherContext && self.data.pusherContext.switchCamera({});
        },

        /**
         * 彻底退出房间并关闭页面
         */
        quitRoom: function(){
            console.log("-----------quit---------")
            self.exitRoom();
            self.data.room.goBack();
        },
        /**
         * 退出房间
         */
        exitRoom: function () {
            if (!self.data.pusherContext) {
                self.data.pusherContext = wx.createLivePusherContext('rtcpusher');
            }
            self.data.pusherContext && self.data.pusherContext.stop && self.data.pusherContext.stop();
            self.data.playerContext && self.data.playerContext.stop();
        },

        postErrorEvent: function (errCode, errMsg) {
            self.postEvent('error', errCode, errMsg);
        },

        postEvent: function (tag, code, detail) {
            self.triggerEvent('RoomEvent', {
                tag: tag,
                code: code,
                detail: detail
            }, {});
        },

        /**
         * 请求SIG服务
         */
        requestSigServer: function (userSig, privMapEncrypt) {
            console.log('获取sig:', this.data);

            self = this;
            var roomID = this.data.roomID;
            var userID = this.data.userID;
            var sdkAppID = this.data.sdkAppID;

            var url = this.data.useCloud ? 'https://official.opensso.tencent-cloud.com/v4/openim/jsonvideoapp' : 'https://yun.tim.qq.com/v4/openim/jsonvideoapp';
            url += '?sdkappid=' + sdkAppID + "&identifier=" + userID + "&usersig=" + userSig + "&random=9999&contenttype=json";

            var reqHead = {
                "Cmd": 1,
                "SeqNo": 1,
                "BusType": 7,
                "GroupId": roomID
            };
            var reqBody = {
                "PrivMapEncrypt": privMapEncrypt,
                "TerminalType": 1,
                "FromType": 3,
                "SdkVersion": 26280566
            };
            console.log("requestSigServer params:", url, reqHead, reqBody);

            wx.request({
                url: url,
                data: {
                    "ReqHead": reqHead,
                    "ReqBody": reqBody
                },
                method: "POST",
                success: function (res) {
                    console.log("requestSigServer success:", res);
                    if (res.data["RspHead"]["ErrorCode"] != 0) {
                        console.log(res.data["RspHead"]["ErrorInfo"]);
                        wx.showToast({
                            icon: 'none',
                            title: res.data["RspHead"]["ErrorInfo"],
                        })

                        self.data.requestSigFailCount++;
                        // 重试3次后还是错误，则抛出错误
                        if (self.data.requestSigFailCount > 3) {
                            self.postErrorEvent(self.data.ERROR_REQUEST_ROOM_SIG, '获取房间SIG错误');
                        } else {
                            setTimeout(() => {
                                console.error('>>>>>>>>', '获取房间sig失败，重试~');
                                self.requestSigServer(userSig, privMapEncrypt);
                            }, 2000);
                        }
                        return;
                    }

                    self.data.requestSigFailCount = 0;

                    var roomSig = JSON.stringify(res.data["RspBody"]);
                    var pushUrl = "room://cloud.tencent.com?sdkappid=" + sdkAppID + "&roomid=" + roomID + "&userid=" + userID + "&roomsig=" + encodeURIComponent(roomSig);

                    // 支持纯音频推流
                    if (self.data.pureAudioPushMod) {
                        var bizbuf = {
                            Str_uc_params: {
                                pure_audio_push_mod: self.data.pureAudioPushMod,
                                record_id: null
                            }
                        }
                        // 自动录制时业务自定义id
                        if (self.data.recordId) {
                            bizbuf.Str_uc_params.record_id = self.data.recordId
                        }
                        pushUrl += '&bizbuf=' + JSON.stringify(bizbuf);
                    }

                    console.log("roomSigInfo", roomID, userID, roomSig, pushUrl);

                    self.setData({
                        pushURL: pushUrl,
                        userID: userID
                    });
                    //设置live-player标签的初始化参数
                    var accessList = res.data["RspBody"].AccessList;
                    console.log(accessList)
                    var playerUrl = 'room://'+accessList[1].Ip + ':' + accessList[1].Port + '/webrtc/' + sdkAppID + '_' + roomID + '_' + userID;
                    console.log(playerUrl);

                    self.setData({
                        accelerateURL: playerUrl
                    });
                },
                fail: function (res) {
                    console.log("requestSigServer fail:", res);
                    wx.showToast({
                        title: '获取房间签名失败',
                    });

                    self.data.requestSigFailCount++;
                    // 重试3次后还是错误，则抛出错误
                    if (self.data.requestSigFailCount > 3) {
                        self.postErrorEvent(self.data.ERROR_REQUEST_ROOM_SIG, '获取房间SIG错误');
                    } else {
                        setTimeout(() => {
                            console.error('>>>>>>>>', '获取房间sig失败，重试~');
                            self.requestSigServer(userSig, privMapEncrypt);
                        }, 2000);
                    }
                }
            })
        },

        onWebRTCUserListPush: function (msg) {
            console.log('================= onWebRTCUserListPush method', msg);
            if (!msg) {
                console.log("!msg")
                return;
            }

            var jsonDic = JSON.parse(msg);
            if (!jsonDic) {
                console.log("!jsonDic");
                return;
            }

            console.log("onWebRTCUserListPush.jsonDict:", jsonDic);
            var newUserList = jsonDic.userlist;
            console.log('=== newUserList: ', JSON.stringify(newUserList));

            var pushers = [];
            if (!newUserList){
                console.log("!newUserList");
                return;
            }
            if (newUserList.length==0) {
                console.log("no new user")
                if(self.data.currentPusher.userID){
                    self.delPusher(self.data.currentPusher)
                }
            } else {
                newUserList && newUserList.forEach(function (val) {
                    var pusher = {
                        userID: val.userid,
                        accelerateURL: val.playurl,
                        playerContext:self.data.playerContext,
                        loading:false
                    };
                    pushers.push(pusher);
                });
                // 如果超过了最大人数，提示
                if (pushers.length > 1) {
                    console("当前房间超过最大人数")
                    self.postErrorEvent(self.data.ERROR_EXCEEDS_THE_MAX_MEMBER, `当前房间超过最大人数2，请稍后进入~`);
                } else{
                    self.onPusherJoin({
                        pushers: pushers
                    });
                }
            }
        },

        //监听到新的视频流时，播放
        onPusherJoin: function (res) {
            //当前，没有pusher，将pusher加入currentPusher
            self.data.hasPlayed = true;
            if(!self.data.currentPusher.userID){
                self.data.currentPusher = res.pushers[0];
                var playerContext = wx.createLivePlayerContext('rtcplayer')
                self.setData({
                    accelerateURL: res.pushers[0].accelerateURL
                },function () {
                    playerContext&playerContext.stop();
                    playerContext&playerContext.play();
                    console.log("++++++++new pusher start+++++++++++")
                })
            }else{
                //当前pusher与新来的pusher不同，播放新来的pusher
                if(self.data.currentPusher.userID != res.pushers[0].userID){
                    var playerContext = wx.createLivePlayerContext('rtcplayer')
                    self.setData({
                        accelerateURL: res.pushers[0].accelerateURL
                    },function () {
                        playerContext&playerContext.stop();
                        console.log("++++++++old pusher stop+++++++++++")
                        playerContext&playerContext.play();
                        console.log("++++++++new pusher start+++++++++++")
                    })
                }else{
                    console.log("no new user")
                }
            }

        },

        //删除res.pushers
        delPusher: function (pusher) {
            self.data.currentPusher = {}
            var player = self.data.playerContext;
            player&player.stop();

        },

        // 推流事件
        onPush: function (e) {
            console.log('============== onPush e userID', this.data.userID);
            if (!self.data.pusherContext) {
                self.data.pusherContext = wx.createLivePusherContext('rtcpusher');
            }
            var code;
            if (e.detail) {
                code = e.detail.code;
            } else {
                code = e;
            }
            console.log('>>>>>>>>>>>> 推流情况：', code);
            var errmessage = '';
            switch (code) {
                case 1002:
                {
                    console.log('推流成功');
                    break;
                }
                case -1301:
                {
                    console.error('打开摄像头失败: ', code);
                    self.postErrorEvent(self.data.ERROR_OPEN_CAMERA, '打开摄像头失败');
                    self.exitRoom();
                    break;
                }
                case -1302:
                {
                    console.error('打开麦克风失败: ', code);
                    self.postErrorEvent(self.data.ERROR_OPEN_MIC, '打开麦克风失败');
                    self.exitRoom();
                    break;
                }
                case -1307:
                {
                    console.error('推流连接断开: ', code);
                    self.postErrorEvent(self.data.ERROR_PUSH_DISCONNECT, '推流连接断开');
                    self.exitRoom();
                    break;
                }
                case 5000:
                {
                    console.log('收到5000: ', code);
                    // 收到5000就退房
                    self.exitRoom();
                    break;
                }
                case 1018:
                {
                    console.log('进房成功', code);
                    break;
                }
                case 1019:
                {
                    console.log('退出房间', code);
                    self.postErrorEvent(self.data.ERROR_JOIN_ROOM, '加入房间异常，请重试');
                    break;
                }
                case 1020:
                {
                    console.log('成员列表', code);
                    self.onWebRTCUserListPush(e.detail.message);
                    break;
                }
                case 1021:
                {
                    console.log('网络类型发生变化，需要重新进房', code);
                    //先退出房间
                    self.exitRoom();

                    //再重新进入房间
                    // this.setData({
                    //   retryIndex: 5,
                    // })

                    self.start();

                    break;
                }
                case 2007:
                {
                    console.log('视频播放loading: ', e.detail.code);
                    break;
                };
                case 2004:
                {
                    console.log('视频播放开始: ', e.detail.code);
                    break;
                };
                default:
                {
                    console.log('推流情况：', code);
                }
            }
        },

        // 标签错误处理
        onError: function (e) {
            console.log('推流错误：', e);
            e.detail.errCode == 10001 ? (e.detail.errMsg = '未获取到摄像头功能权限') : '';
            e.detail.errCode == 10002 ? (e.detail.errMsg = '未获取到录音功能权限') : '';
            self.postErrorEvent(self.data.ERROR_CAMERA_MIC_PERMISSION, e.detail.errMsg || '未获取到摄像头、录音功能权限，请删除小程序后重新打开')
            wx.showModal({
                title: e.detail.errMsg|| '未获取到摄像头、录音功能权限',
                content : "请重启微信或删除小程序后重新打开"
            })
        },

        //播放器live-player回调
        onPlay: function (e) {
            console.log('>>>>>>>>>>>> onPlay code:', e.detail.code);

            switch (e.detail.code) {
                case 2007:
                {
                    console.log('视频播放loading: ', e);
                    break;
                }
                case 2004:
                {
                    console.log('视频播放开始: ', e);
                    break;
                }
                case -2301:
                {
                    console.log('网络连接断开,播放器已暂时停止播放');
                    self.delPusher();
                    if(self.data.hasPlayed){
                        if(app.globalData.userType=="doctor"){
                            wx.showModal({
                                title:"对方已断开连接",
                                content: "请点击确认或取消返回聊天界面",
                                success: self.quitRoom()
                            })
                        }else{
                            wx.showModal({
                                title:"对方已断开连接",
                                content: "请点击右上角按钮退出视频",
                            })
                        }
                    }
                    break;
                }
                case 2103:{
                    console.log('重新连接');
                    console.log('正在重新连接', e);
                    break;
                }
                default:
                {
                    console.log('拉流情况：', e);
                }
            }
        },
    }
})