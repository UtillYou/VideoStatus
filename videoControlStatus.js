;(function($) {
  var VideoStatus = function($this, optionsParam) {
    var defaults = {
      channelHeight: 30,
      channelTitleWidth: null,
      hourWidth: null,
      minuteWidth: null,
      secondWidth: null,
      halfHourWidth: null,
      containerWidth: null,
      thumbContainerWidth: null,
      channelNum: 0,
      sectionTmpl: '<div class="section">$index<div class="section-half"></div></div>',
      channelTitleTmpl: '<div class="channel-title">$name</div>',
      channelTmpl: '<div class="channel"></div>',
      greenTmpl: '<div class="green"></div>',
      defaultDate: null,
      onScale: null, // 鼠标在指示器区域缩放事件
      onDragStart: null, // 鼠标拖拽指示器和红线开始
      onDrag: null, // 鼠标拖拽指示器和红线事件
      onDragEnd: null, // 鼠标拖拽指示器和红线结束
      onClick: null, // 鼠标点击通道内容区事件
      onStart: null, // 开始播放事件
      onStop: null, // 停止播放事件
      onPause: null, // 暂停播放事件
      onContinue: null, // 暂停后继续播放事件
      onPlaying: null, // 持续播放事件，每向前播放一点就会触发
      onStatusClick: null // 鼠标点击选中时间点后触发事件
    };
    var options = $.extend(defaults, optionsParam);

    options.channelTitleWidth = parseInt($this.find('.left').css('width'));
    options.containerWidth = parseInt($this.css('width'));
    options.thumbContainerWidth = options.containerWidth - options.channelTitleWidth;
    options.hourWidth = options.thumbContainerWidth / 24;
    options.secondWidth = options.minuteWidth = options.thumbContainerWidth / 60;
    options.thumbWidth = parseInt($this.find('.thumb').css('width'));
    options.channelNum = options.channels.length;
    this.$this = $this;
    this.options = options;
    this.state = {
      intervalHour: 0,
      intervalMinute: 0,
      currentHour: 0,
      currentMinute: 0,
      currentSecond: 0,
      currentChannels: options.channels, // 当前的通道数据，调用者通过 setChannels 方法可动态显示隐藏通道
      timeLevel: 'hour', // hour,minute,second
      isThumbMoving: false, // 指示器是否在被拖动
      timerId: null, // 控件的定时器ID
      speed: 1, // 播放速度，1,2,,4,8,16
      direction: 'forward' // 播放方向，正常播放 forward，后退 backward
    };
    this.initHtml();
    this.renderHour();
    this.initBind();
    this.render();
    return this;
  };

    /**
     * 初始化html
     * 左侧通道标题和右侧通道内容区
     * 还有红线高度
     */
  VideoStatus.prototype.initHtml = function() {
    var $this = this.$this;
    var options = this.options;

    var channelTitleContainer = $this.find('.channel-title-container');
    var channelContainer = $this.find('.channel-container');

    channelTitleContainer.empty();
    for (var i = 0; i < options.channels.length; i++) {
      var channel = options.channels[i];
      channelTitleContainer.append($(options.channelTitleTmpl.replace('$name', '通道' + channel)).attr('id', 'channelTitle_' + channel));
    }
    channelContainer.empty();
    for (i = 0; i < options.channels.length; i++) {
      var channel2 = options.channels[i];
      channelContainer.append($(options.channelTmpl).attr('id', 'channel_' + channel2));
    }

    $this.find('.line').css('height', (options.channelHeight * (i + 1)) + 'px');

    var now = null;
    var channelData = options.channelData;
    if (channelData && Object.keys(channelData).length > 0) {
      var channelIds = Object.keys(channelData);
      var channelDatas = channelData[channelIds[0]];
      if (channelDatas.length > 0) {
        now = new Date(channelDatas[0].StartTime.replace(/-/g, '/'));
      } else {
        now = options.defaultDate ? options.defaultDate : new Date();
      }
    } else {
      now = options.defaultDate ? options.defaultDate : new Date();
    }
    var date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    $this.find('.day').html(date);
  };

  /**
     * 初始化绑定事件
     * 标尺区域鼠标滚动事件
     * 指示器拖拽事件
     * 通道区域点击事件
     */
  VideoStatus.prototype.initBind = function() {
    var self = this;
    var $this = this.$this;
    var options = this.options;
    var state = this.state;

    // 绑定标尺滚动事件
    $($this.find('.ruler')).off('mousewheel DOMMouseScroll').on('mousewheel DOMMouseScroll', function(event) {
      event.preventDefault();
      // delta > 0 向上滚=>放大；delta < 0 向下滚=>缩小
      var delta = (event.originalEvent.wheelDelta && (event.originalEvent.wheelDelta > 0 ? 1 : -1)) || // chrome & ie
                (event.originalEvent.detail && (event.originalEvent.detail > 0 ? -1 : 1));// firefox
      if ((delta > 0 && state.timeLevel === 'second') || (delta < 0 && state.timeLevel === 'hour')) {
        return;
      }
      if (delta > 0) {
        if (state.timeLevel === 'hour') {
          state.timeLevel = 'minute';
          self.renderMinuteSecond();
        } else if (state.timeLevel === 'minute') {
          state.timeLevel = 'second';
          self.renderMinuteSecond();
        }
        ;
        self.updateInterval(event.originalEvent.pageX);
      } else {
        if (state.timeLevel === 'second') {
          self.renderMinuteSecond();
          state.timeLevel = 'minute';
        } else if (state.timeLevel === 'minute') {
          self.renderHour();
          state.timeLevel = 'hour';
        }
      }

      self.updateIntervalText();
      self.onScale();
    });
    // 绑定指示器拖拽事件
    $this.find('.thumb').bind('mousedown', function(event) {
      /* 获取需要拖动节点的坐标 */
      var prevLeft = parseInt($(this).css('left'));
      /* 获取当前鼠标的坐标 */
      var mouseX = event.originalEvent.pageX;
      var thumb = $(this);
      var leftMargin = -(options.thumbWidth / 2);
      var rightMargin = options.thumbContainerWidth - options.thumbWidth - leftMargin;
      state.isThumbMoving = true;
      self.onDragStart();
      /* 绑定拖动事件 */
      /* 由于拖动时，可能鼠标会移出元素，所以应该使用全局（document）元素 */
      $(document).bind('mousemove', function(ev) {
        if (state.isThumbMoving) {
          ev.preventDefault();
          /* 计算鼠标移动了的位置 */
          var _x = ev.originalEvent.pageX - mouseX;
          /* 设置移动后的元素坐标 */
          var nowLeft = prevLeft + _x;
          /* 改变目标元素的位置 */
          if (nowLeft < leftMargin) {
            thumb.css('left', leftMargin + 'px');
          } else if (nowLeft > rightMargin) {
            thumb.css('left', rightMargin + 'px');
          } else {
            thumb.css('left', nowLeft + 'px');
          }
          self.updateThumbTime();
          self.onDrag();
        }
      });
    });
    $(document).bind('mouseup', function(event) {
      if (state.isThumbMoving) {
        $(document).unbind('mousemove');
        state.isThumbMoving = false;
        self.onDragEnd();
      }
    });

    // 绑定通道区域点击事件
    $this.find('.channel-container').bind('click', function(e) {
      var thumb = $this.find('.thumb');
      var containerOffsetX = $this.offset().left;
      var newThumbLeft = e.originalEvent.pageX - (options.channelTitleWidth + containerOffsetX) - (options.thumbWidth / 2);
      thumb.css({
        'left': newThumbLeft + 'px',
        'visibility': 'visible'
      });
      self.updateThumbTime();
      self.onStatusClick();
    });
  };

  /**
     * 渲染指示器区域小时级别的网格
     */
  VideoStatus.prototype.renderHour = function() {
    var $this = this.$this;
    var ruler = $this.find('.ruler');
    ruler.empty();
    var options = this.options;
    for (var i = 0; i < 24; i++) {
      var $hour = $(options.sectionTmpl.replace('$index', i));
      $hour.css('width', options.hourWidth + 'px').css('left', (options.thumbContainerWidth * i / 24) + 'px');
      $hour.attr('id', 'hourSection_' + i);
      ruler.append($hour);
    }
    return this;
  };

  /**
     * 渲染指示器区域分和秒级别的网格
     */
  VideoStatus.prototype.renderMinuteSecond = function() {
    var $this = this.$this;
    var ruler = $this.find('.ruler');
    ruler.empty();
    var options = this.options;
    for (var i = 0; i < 60; i++) {
      var $hour = $(options.sectionTmpl.replace('$index', i));
      $hour.css('width', options.minuteWidth + 'px').css('left', (options.thumbContainerWidth * i / 60) + 'px');
      $hour.attr('id', 'hourSection_' + i);
      ruler.append($hour);
    }
    return this;
  };

  /**
     * 更新指示器上的文本，时：分：秒
     */
  VideoStatus.prototype.updateThumbText = function() {
    var $this = this.$this;
    var state = this.state;

    var $h = $this.find('.thumb .h');
    var $m = $this.find('.thumb .m');
    var $s = $this.find('.thumb .s');
    $h.html(this.util.padZero(state.currentHour) + ':');
    $m.html(this.util.padZero(state.currentMinute) + ':');
    $s.html(this.util.padZero(state.currentSecond));
  };

  /**
     * 根据当前指示器的所在位置
     * 更新指示器和当前状态的时间值
     * 时分秒
     */
  VideoStatus.prototype.updateThumbTime = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    var thumb = $this.find('.thumb');
    var lineLeft = parseInt(thumb.css('left')) + (options.thumbWidth / 2);
    var second = 0;
    if (state.timeLevel === 'hour') {
      second = lineLeft * (3600 * 24) / options.thumbContainerWidth;
      state.currentHour = parseInt(second / 3600);
      second -= state.currentHour * 3600;
      state.currentMinute = parseInt(second / 60);
      second -= state.currentMinute * 60;
      state.currentSecond = parseInt(second);
    } else if (state.timeLevel === 'minute') {
      state.currentHour = state.intervalHour;
      second = lineLeft * 3600 / options.thumbContainerWidth;
      state.currentMinute = parseInt(second / 60);
      second -= state.currentMinute * 60;
      state.currentSecond = parseInt(second);
    } else {
      state.currentHour = state.intervalHour;
      state.currentMinute = state.intervalMinute;
      second = lineLeft * 60 / options.thumbContainerWidth;
      state.currentSecond = parseInt(second);
    }
    if (state.currentHour === 24) {
      state.currentHour = 23;
      state.currentMinute = 59;
      state.currentSecond = 59;
    }

    this.updateThumbText();
  };

  /**
     * 更新左上角的文本，显示当前整个插件的时间区间
     */
  VideoStatus.prototype.updateIntervalText = function() {
    var $this = this.$this;
    var state = this.state;

    if (state.timeLevel === 'hour') {
      $this.find('.title').html('小时');
    } else if (state.timeLevel === 'minute') {
      $this.find('.title').html('分钟(' + state.intervalHour + '-' + (state.intervalHour + 1) + '时)');
    } else {
      $this.find('.title').html('秒(' + state.intervalHour + ':' + state.intervalMinute + '-' + state.intervalHour + ':' + (state.intervalMinute + 1) + '分)');
    }
  };

  /**
     * 更新当前时间区间
     * @param {number} pageX 事件触发时的鼠标x值
     */
  VideoStatus.prototype.updateInterval = function(pageX) {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;

    var containerOffsetX = $this.offset().left;
    var lineLeft = pageX - (options.channelTitleWidth + containerOffsetX);
    var second = 0;
    if (state.timeLevel === 'minute') {
      second = lineLeft * (3600 * 24) / options.thumbContainerWidth;
      state.intervalHour = parseInt(second / 3600);
    } else if (state.timeLevel === 'second') {
      second = lineLeft * 3600 / options.thumbContainerWidth;
      state.intervalMinute = parseInt(second / 60);
    }
    if (state.intervalHour === 24) {
      state.intervalHour = 23;
      state.intervalMinute = 59;
    }
  };

  /**
     * 设置当前的事件，设置后控件会自动更新相应状态
     * @param {object|string} time 传日期对象或者日期字符串
     * @param {boolean} withDate 日期字符串是否包含日期部分，比如 12:33:33 不包含； 2018/3/6 12:33:33 就包含
     */
  VideoStatus.prototype.setCurrentTime = function(time, withDate) {
    var date = null;
    if (typeof time === 'object') {
      date = time;
    } else if (typeof time === 'string') {
      if (withDate) {
        date = new Date(time);
      } else {
        var now = new Date();
        var dateStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' ' + time;
        date = new Date(dateStr);
      }
    } else {
      return false;
    }
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    this.setCurrentTimeByHms(hour, minute, second);
  };

  /**
     * 根据时分秒来更新当前时间，更新后控件会自动更新相应状态
     * @param {number} hour 时
     * @param {number} minute 分
     * @param {number} second 秒
     */
  VideoStatus.prototype.setCurrentTimeByHms = function(hour, minute, second) {
    var state = this.state;
    state.currentHour = hour;
    state.currentMinute = minute;
    state.currentSecond = second;

    this.renderRed();
    this.updateThumbText();
  };

  /**
     * 设置速度
     * @param {number} speed 速度 1,2,4,8,16
     */
  VideoStatus.prototype.setSpeed = function(speed) {
    var state = this.state;
    state.speed = speed;
    var interval = parseInt(1000 / state.speed);
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    state.timerId = setInterval(this.go.bind(this), interval);
  };

  /**
     * 改变方向
     * @param {string} direction 方向 forward,backward
     */
  VideoStatus.prototype.setDirection = function(direction) {
    var state = this.state;
    var d = direction === 'forward' ? 'forward' : 'backward';
    state.direction = d;
  };

  /**
     * 设置通道号
     * @param {array[string]|string} channelsParam 通道数组,如果是数组就不用改，传字符串也可以
     */
  VideoStatus.prototype.setChannels = function(channelsParam) {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    var channels = null;
    if (typeof channelsParam === 'object') {
      channels = channelsParam;
    } else if (typeof channelsParam === 'string') {
      channels = channelsParam.split(',');
    } else {
      return false;
    }
    // 设置当前通道数据
    state.currentChannels = channels;

    for (var i = 0; i < options.channels.length; i++) {
      var channelId = options.channels[i].toString();
      if (channels.indexOf(channelId) < 0) {
        $this.find('#channelTitle_' + channelId).hide();
        $this.find('#channel_' + channelId).hide();
      } else {
        $this.find('#channelTitle_' + channelId).show();
        $this.find('#channel_' + channelId).show();
      }
    }
    $this.find('.line').css('height', (options.channelHeight * (Math.min(channels.length, options.channels.length) + 1)) + 'px');
  };

  /**
     * 持续播放
     * 通过改变当前时间播放
     */
  VideoStatus.prototype.go = function() {
    var state = this.state;
    var second = state.direction === 'forward' ? 1 : -1;
    var totalSecond = this.util.hms2Second(state.currentHour, state.currentMinute, state.currentSecond);
    totalSecond += second;
    var hms = this.util.second2Hms(totalSecond);
    this.setCurrentTimeByHms(hms.hour, hms.minute, hms.second);
    this.onPlaying();
  };

  /**
     * 开始播放，从所有通道最前面的时间块开始播放
     */
  VideoStatus.prototype.play = function() {
    var state = this.state;
    var options = this.options;
    var interval = parseInt(1000 / state.speed);
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    state.timerId = setInterval(this.go.bind(this), interval);
    // 将时间设置到所有通道最前面的时间块
    var minDate = null;
    var itemDate = null;
    var channelData = options.channelData;
    var channelIds = Object.keys(channelData);
    // 过滤隐藏了的通道，也就是不在 state.currentChannels 中的通道
    channelIds = channelIds.filter(function(c) {
      return state.currentChannels.filter(function(cc) {
        return c.toString() === cc.toString();
      }).length > 0;
    });

    for (var i = 0; i < channelIds.length; i++) {
      var channelId = channelIds[i];
      var greens = channelData[channelId];
      for (var j = 0; j < greens.length; j++) {
        var greenData = greens[j];
        if (!minDate) {
          minDate = new Date(greenData.StartTime.replace(/-/g, '/'));
        } else if (minDate > (itemDate = new Date(greenData.StartTime.replace(/-/g, '/')))) {
          minDate = itemDate;
        }
      }
    }
    this.setCurrentTime(minDate);
    this.onStart();
  };

  /**
     * 停止播放
     */
  VideoStatus.prototype.stop = function() {
    var state = this.state;
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    this.setCurrentTimeByHms(0, 0, 0);
    this.onStop();
  };

  /**
     * 暂停播放
     */
  VideoStatus.prototype.pause = function() {
    var state = this.state;
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    this.onPause();
  };

  /**
     * 继续播放
     */
  VideoStatus.prototype.continue = function() {
    var state = this.state;
    var interval = parseInt(1000 / state.speed);
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    state.timerId = setInterval(this.go.bind(this), interval);
    this.onContinue();
  };

  /**
     * 销毁
     */
  VideoStatus.prototype.destory = function() {
    var $this = this.$this;
    var state = this.state;
    var options = this.options;
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    var channelTitleContainer = $this.find('.channel-title-container');
    var channelContainer = $this.find('.channel-container');

    channelTitleContainer.empty();
    channelContainer.empty();
    $this.find('.line').css('height', options.channelHeight + 'px');
    $this.find('.title').html('小时');
  };

  /**
     * 渲染绿色区域和红线
     */
  VideoStatus.prototype.render = function() {
    this.renderGreen();
    this.renderRed();
  };

  /**
     * 渲染红线
     */
  VideoStatus.prototype.renderRed = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;

    var totalSecond = this.util.hms2Second(state.currentHour, state.currentMinute, state.currentSecond);
    var redLeft = 0;
    if (state.timeLevel === 'hour') {
      redLeft = options.thumbContainerWidth * totalSecond / (3600 * 24);
    } else if (state.timeLevel === 'minute') {
      redLeft = options.thumbContainerWidth * (totalSecond - state.intervalHour * 3600) / 3600;
    } else {
      redLeft = options.thumbContainerWidth * (totalSecond - (state.intervalHour * 3600 + state.intervalMinute * 60)) / 60;
    }
    redLeft -= options.thumbWidth / 2;
    $this.find('.thumb').css('left', redLeft + 'px');
    if ((redLeft < -options.thumbWidth / 2) || (redLeft > options.thumbContainerWidth + options.thumbWidth / 2)) {
      $this.find('.thumb').css('visibility', 'hidden');
    } else {
      $this.find('.thumb').css('visibility', 'visible');
    }
  };

  /**
     * 渲染绿色区域
     */
  VideoStatus.prototype.renderGreen = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;

    var channelData = options.channelData;
    var channelIds = Object.keys(channelData);
    for (var i = 0; i < channelIds.length; i++) {
      var channelId = channelIds[i];
      var greens = channelData[channelId];
      var $channel = $this.find('#channel_' + channelId);
      $channel.empty();
      for (var j = 0; j < greens.length; j++) {
        var greenData = greens[j];
        var $green = $(options.greenTmpl);
        var hmsStart = this.util.parseDate2HMS(greenData.StartTime.replace(/-/g, '/'));
        var hmsEnd = this.util.parseDate2HMS(greenData.EndTime.replace(/-/g, '/'));
        var secondDiff = hmsEnd.totalSecond - hmsStart.totalSecond;
        var greenWidth = 0;
        var greenLeft = 0;
        if (state.timeLevel === 'hour') {
          greenWidth = options.thumbContainerWidth * secondDiff / (3600 * 24);
          greenLeft = options.thumbContainerWidth * hmsStart.totalSecond / (3600 * 24);
        } else if (state.timeLevel === 'minute') {
          greenWidth = options.thumbContainerWidth * secondDiff / 3600;
          greenLeft = options.thumbContainerWidth * (hmsStart.totalSecond - state.intervalHour * 3600) / 3600;
        } else {
          greenWidth = options.thumbContainerWidth * secondDiff / 60;
          greenLeft = options.thumbContainerWidth * (hmsStart.totalSecond - (state.intervalHour * 3600 + state.intervalMinute * 60)) / 60;
        }
        $green.css({
          width: greenWidth + 'px',
          left: greenLeft + 'px'
        });
        $channel.append($green);
      }
    }
  };

  VideoStatus.prototype.util = {
    /**
         * 如果传入的数字小于10，给前面加0
         * 返回字符串
         */
    padZero: function(num) {
      if (num < 10) {
        return '0' + num.toString();
      }
      return num.toString();
    },
    /**
         * 将日期字符串解析成时分秒的对象
         * 还有时分秒累计的总秒数
         */
    parseDate2HMS: function(dateStr) {
      var date = new Date(dateStr);
      var hour = date.getHours();
      var minute = date.getMinutes();
      var second = date.getSeconds();
      return {
        hour: hour,
        minute: minute,
        second: second,
        totalSecond: hour * 3600 + minute * 60 + second
      };
    },
    /**
         * 计算时分秒的总秒数
         */
    hms2Second: function(hour, minute, second) {
      return hour * 3600 + minute * 60 + second;
    },
    /**
         * 将字符串形式的时分秒
         * 计算时分秒的总秒数
         * 07:22:45 => 43560
         */
    hmsStr2Second: function(hmsStr) {
      var hmsArr = hmsStr.split(':');
      var hour = parseInt(hmsArr[0]);
      var minute = parseInt(hmsArr[1]);
      var second = parseInt(hmsArr[2]);
      return hour * 3600 + minute * 60 + second;
    },
    /**
         * 将秒转换成时分秒
         */
    second2Hms: function(secondParam) {
      var hour = 0;
      var minute = 0;
      var second = secondParam;
      hour = parseInt(second / 3600);
      second -= hour * 3600;
      minute = parseInt(second / 60);
      second -= minute * 60;
      return {
        hour: hour,
        minute: minute,
        second: second
      };
    }
  };

  /**
     * 缩放事件
     * 当鼠标在顶部thumb区域缩放改变事件维度时触发
     */
  VideoStatus.prototype.onScale = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    this.render();
    if (options.onScale && typeof options.onScale === 'function') {
      options.onScale.call(this, $this, state);
    }
  };

  /**
     * 拖拽事件
     * 当鼠标在拖动指示器或者红线时触发
     */
  VideoStatus.prototype.onDrag = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onDrag && typeof options.onDrag === 'function') {
      options.onDrag.call(this, $this, state);
    }
  };

  /**
     * 拖拽事件开始
     * 当鼠标在拖动指示器或者红线时触发
     */
  VideoStatus.prototype.onDragStart = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onDragStart && typeof options.onDragStart === 'function') {
      options.onDragStart.call(this, $this, state);
    }
  };

  /**
     * 拖拽事件结束
     * 当鼠标在拖动指示器或者红线时触发
     */
  VideoStatus.prototype.onDragEnd = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onDragEnd && typeof options.onDragEnd === 'function') {
      options.onDragEnd.call(this, $this, state);
    }
  };

  /**
     * 点击选中时间段事件
     * 当鼠标点击时间刻度后触发
     */
  VideoStatus.prototype.onStatusClick = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onStatusClick && typeof options.onStatusClick === 'function') {
      options.onStatusClick.call(this, $this, state);
    }
  };

  /**
     * 持续播放事件
     * 当控件在不断的播放时触发
     */
  VideoStatus.prototype.onPlaying = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onPlaying && typeof options.onPlaying === 'function') {
      options.onPlaying.call(this, $this, state);
    }
  };

  /**
     * 开始播放事件
     * 当控件开始播放时触发
     */
  VideoStatus.prototype.onStart = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onStart && typeof options.onStart === 'function') {
      options.onStart.call(this, $this, state);
    }
  };

  /**
     * 停止播放事件
     * 当控件开始播放时触发
     */
  VideoStatus.prototype.onStop = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onStop && typeof options.onStop === 'function') {
      options.onStop.call(this, $this, state);
    }
  };

  /**
     * 暂停播放事件
     * 当控件暂停播放时触发
     */
  VideoStatus.prototype.onPause = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onPause && typeof options.onPause === 'function') {
      options.onPause.call(this, $this, state);
    }
  };

  /**
     * 继续播放事件
     * 当控件继续播放时触发
     */
  VideoStatus.prototype.onContinue = function() {
    var $this = this.$this;
    var options = this.options;
    var state = this.state;
    if (options.onContinue && typeof options.onContinue === 'function') {
      options.onContinue.call(this, $this, state);
    }
  };

  VideoStatus.prototype.test = function() {
    // console.log('test this:', this);
  };

  $.fn.videoStatus = function(options) {
    return new VideoStatus(this, options);
  };
})(jQuery);
