#### 使用方式

* 引入代码库,开发时使用less，线上可使用css

``` html
<link rel="stylesheet/less" type="text/css" href="video-status.less" />
<script src="./less.min.js"></script>
<script src="jquery.js" charset="utf-8"></script>
<script src="video-status.js" charset="utf-8"></script>
```

* `html` 结构:

``` html
<div id="container" style="width:1500px;height:300px;" class="video-status">
  <div class="left">
    <div class="day">2018-04-26</div>
    <div class="title">小时</div>
    <div class="channel-title-container">

    </div>
  </div>
  <div class="right">
    <div class="thumb-container">
      <div class="thumb">
      <span class="h">00:</span>
      <span class="m">00:</span>
      <span class="s">00</span>
      <div class="line">

      </div>
    </div>
  </div>
    <div class="ruler">
      <div class="section"><div class="section-half"></div></div>
    </div>
    <div class="channel-container">
    </div>
  </div>
</div>
```

* JS 调用组件并传参：

``` javascript
var demo = $('#container').videoStatus({
  onDrag:function($this,state){
    if ($('#watchDrag').prop('checked')) {
      $info.append($('<p>').html('拖拽；state:'+JSON.stringify(state)));
    }
  },
  onDragStart:function($this,state){
    if ($('#watchDrag').prop('checked')) {
      $info.append($('<p>').html('拖拽 开始；state:'+JSON.stringify(state)));
    }
  },
  onDragEnd:function($this,state){
    if ($('#watchDrag').prop('checked')) {
      $info.append($('<p>').html('拖拽 结束；state:'+JSON.stringify(state)));
    }
  },
  onPlaying:function($this,state){
    if ($('#watchPlaying').prop('checked')) {
      $info.append($('<p>').html('持续播放；state:'+JSON.stringify(state)));
    }
  },
  onStart:function($this,state){
    if ($('#watchPlaying').prop('checked')) {
      $info.append($('<p>').html('开始播放；state:'+JSON.stringify(state)));
    }
  },
  onPause:function($this,state){
    if ($('#watchPlaying').prop('checked')) {
      $info.append($('<p>').html('暂停播放；state:'+JSON.stringify(state)));
    }
  },
  onContinue:function($this,state){
    if ($('#watchPlaying').prop('checked')) {
      $info.append($('<p>').html('继续播放；state:'+JSON.stringify(state)));
    }
  },
  onStop:function($this,state){
    if ($('#watchPlaying').prop('checked')) {
      $info.append($('<p>').html('结束播放；state:'+JSON.stringify(state)));
    }
  },
  onScale:function($this,state){
    if ($('#watchScale').prop('checked')) {
      $info.append($('<p>').html('缩放事件；state:'+JSON.stringify(state)));
    }
  },
  onStatusClick:function($this,state){
    if ($('#watchClick').prop('checked')) {
      $info.append($('<p>').html('点击事件；state:'+JSON.stringify(state)));
    }
  },
  channels:[1,3,5],
  channelData:{"1":[
    {"ID":1,"DisplayText":"","StationId":1,"StartTime":"2018-06-10 10:00:00","EndTime":"2018-06-10 11:36:00"},
    {"ID":2,"DisplayText":"","StationId":1,"StartTime":"2018-06-10 15:00:00","EndTime":"2018-06-10 15:37:23"},
    ],
    "5":[
    {"ID":3,"DisplayText":"","StationId":5,"StartTime":"2018-06-10 5:55:55","EndTime":"2018-06-10 09:36:30"},
    {"ID":4,"DisplayText":"","StationId":5,"StartTime":"2018-06-10 20:00:00","EndTime":"2018-06-10 22:37:23"},
    ]}
});
```
返回的实例可继续调用方法

* 预览

![预览](./capture.png?raw=true '预览')
