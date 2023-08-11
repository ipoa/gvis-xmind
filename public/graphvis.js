(function () {
  const DGraph = {
    version: '4.5.0',
    Group_zIndex: 1,
    Link_zIndex: 2,
    Node_zIndex: 3,
    SceneMode: { normal: 'normal', drag: 'drag', select: 'select' },
    Element: function () {
      (this.initialize = function () {
        this.elementType = 'element';
        this.serializedProperties = ['elementType'];
        this.propertiesStack = [];
      }),
        (this.removeHandler = function () {}),
        (this.save = function () {
          var self = this;
          var newObj = {};
          self.serializedProperties.forEach(function (properties) {
            newObj[properties] = self[properties];
          });
          self.propertiesStack.push(newObj);
        }),
        (this.restore = function () {
          var self = this;
          if (
            null != self.propertiesStack &&
            0 != self.propertiesStack.length
          ) {
            var stack = self.propertiesStack.pop();
            self.serializedProperties.forEach(function (attr) {
              self[attr] = stack[attr];
            });
          }
        });
    },
  };
  !(function (DGraph) {
    function MessageBus(name) {
      var self = this;
      this.name = name;
      this.messageMap = {};
      this.messageCount = 0;
      (this.subscribe = function (name, caller) {
        var message = self.messageMap[name];
        null == message && (self.messageMap[name] = []),
          self.messageMap[name].push(caller),
          self.messageCount++;
      }),
        (this.unsubscribe = function (name) {
          var message = self.messageMap[name];
          null != message &&
            ((self.messageMap[name] = null),
            delete self.messageMap[name],
            self.messageCount--);
        }),
        (this.publish = function (name, caller, d) {
          var message = self.messageMap[name];
          if (null != message) {
            for (var i = 0; i < message.length; i++) {
              d
                ? !(function (event, args) {
                    setTimeout(function () {
                      event(args);
                    }, 10);
                  })(message[i], caller)
                : message[i](caller);
            }
          }
        });
    }
    function getEventPosition(event) {
      var pos = null;
      if (!event.pageX) {
        event.pageX =
          event.clientX + document.body.scrollLeft - document.body.clientLeft;
        event.pageY =
          event.clientY + document.body.scrollTop - document.body.clientTop;
        pos = cloneEvent(event);
      } else {
        pos = cloneEvent(event);
      }
      return pos;
    }
    function cloneEvent(event) {
      var _event = {};
      for (var key in event)
        'returnValue' != key &&
          'keyLocation' != key &&
          (_event[key] = event[key]);
      return _event;
    }
    function clone(obj) {
      var newObj = {};
      for (var key in obj) newObj[key] = obj[key];
      return newObj;
    }
    function removeFromArray(arr, item) {
      for (var i = 0; i < arr.length; i++) {
        var obj = arr[i];
        if (obj === item) {
          arr = arr.del(i);
          break;
        }
      }
      return arr;
    }
    function getOffsetPosition(a) {
      if (!a) return { left: 0, top: 0 };
      var b = 0,
        c = 0;
      if ('getBoundingClientRect' in document.documentElement) {
        var d = a.getBoundingClientRect(),
          e = a.ownerDocument,
          f = e.body,
          g = e.documentElement,
          h = g.clientTop || f.clientTop || 0,
          i = g.clientLeft || f.clientLeft || 0,
          b =
            d.top + (self.pageYOffset || (g && g.scrollTop) || f.scrollTop) - h,
          c =
            d.left +
            (self.pageXOffset || (g && g.scrollLeft) || f.scrollLeft) -
            i;
      } else {
        do
          (b += a.offsetTop || 0),
            (c += a.offsetLeft || 0),
            (a = a.offsetParent);
        while (a);
      }
      return { left: c, top: b };
    }
    function getDistance(pointA, pointB, x1, y1) {
      var dx, dy;
      return (
        null == x1 && null == y1
          ? ((dx = pointB.x - pointA.x), (dy = pointB.y - pointA.y))
          : ((dx = x1 - pointA), (dy = y1 - pointB)),
        Math.sqrt(dx * dx + dy * dy)
      );
    }
    function isPointInLine(mousePoint, startPoint, endPoint) {
      var distance = DGraph.util.getDistance(startPoint, endPoint),
        dis1 = DGraph.util.getDistance(startPoint, mousePoint),
        dis2 = DGraph.util.getDistance(endPoint, mousePoint),
        flag = Math.abs(dis1 + dis2 - distance) <= 0.5;
      return flag;
    }
    function lineVir(x1, y1, x2, y2) {
      var angle = (y2 - y1) / (x2 - x1),
        distance = y1 - x1 * angle;
      function bound(num) {
        return num * angle + distance;
      }
      return (
        (bound.k = angle),
        (bound.b = distance),
        (bound.x1 = x1),
        (bound.x2 = x2),
        (bound.y1 = y1),
        (bound.y2 = y2),
        bound
      );
    }
    function inRange(cpoint, point1, point2) {
      var distance1 = Math.abs(point1 - point2),
        distance2 = Math.abs(point1 - cpoint),
        distance3 = Math.abs(point2 - cpoint),
        distance = Math.abs(distance1 - (distance2 + distance3));
      return 0.000001 > distance ? true : false;
    }
    function isPointInLineSeg(pointA, pointB, viaPoint) {
      return (
        inRange(pointA, viaPoint.x1, viaPoint.x2) &&
        inRange(pointB, viaPoint.y1, viaPoint.y2)
      );
    }
    function intersection(lineA, lineB) {
      if (lineA.k == lineB.k) {
        return null;
      }
      var pointX, pointY;
      if (Infinity == lineA.k || lineA.k == -Infinity) {
        (pointX = lineA.x1), (pointY = lineB(lineA.x1));
      } else if (Infinity == lineB.k || lineB.k == -Infinity) {
        (pointX = lineB.x1), (pointY = lineA(lineB.x1));
      } else {
        (pointX = (lineB.b - lineA.b) / (lineA.k - lineB.k)),
          (pointY = lineA(pointX));
      }
      if (0 == isPointInLineSeg(pointX, pointY, lineA)) {
        return null;
      }
      if (0 == isPointInLineSeg(pointX, pointY, lineB)) {
        return null;
      }
      return { x: pointX, y: pointY };
    }
    function intersectionLineBound(point, bound) {
      var line = lineVir(bound.left, bound.top, bound.left, bound.bottom),
        insertPoint = intersection(point, line);
      if (null == insertPoint) {
        line = lineVir(bound.left, bound.top, bound.right, bound.top);
        insertPoint = intersection(point, line);
        if (null == insertPoint) {
          (line = lineVir(bound.right, bound.top, bound.right, bound.bottom)),
            (insertPoint = intersection(point, line));
          if (null == insertPoint) {
            (line = lineVir(
              bound.left,
              bound.bottom,
              bound.right,
              bound.bottom
            )),
              (insertPoint = intersection(point, line));
          }
        }
      }
      return insertPoint;
    }
    function pointOnCircle(x, y, radius, angle) {
      return {
        x: x + radius * Math.cos(angle),
        y: y + radius * Math.sin(angle),
      };
    }
    function findAngle(sx, sy, ex, ey) {
      var tmp = Math.atan((ey - sy) / (ex - sx));
      if (ex - sx >= 0) {
        return tmp;
      } else {
        return tmp + Math.PI;
      }
    }
    function containStroke(x0, y0, x1, y1, lineWidth, x, y) {
      if (lineWidth === 0) {
        return false;
      }
      let _l = lineWidth;
      let _a = 0;
      let _b = x0;
      if (
        (y > y0 + _l && y > y1 + _l) ||
        (y < y0 - _l && y < y1 - _l) ||
        (x > x0 + _l && x > x1 + _l) ||
        (x < x0 - _l && x < x1 - _l)
      ) {
        return false;
      }
      if (x0 !== x1) {
        _a = (y0 - y1) / (x0 - x1);
        _b = (x0 * y1 - x1 * y0) / (x0 - x1);
      } else {
        return Math.abs(x - x0) <= _l / 2;
      }
      let tmp = _a * x - y + _b;
      let _s = (tmp * tmp) / (_a * _a + 1);
      return _s <= ((_l / 2) * _l) / 2;
    }
    function containBerzierStroke(
      x0,
      y0,
      x1,
      y1,
      x2,
      y2,
      x3,
      y3,
      lineWidth,
      x,
      y
    ) {
      if (lineWidth === 0) {
        return false;
      }
      let _l = lineWidth;
      if (
        (y > y0 + _l && y > y1 + _l && y > y2 + _l && y > y3 + _l) ||
        (y < y0 - _l && y < y1 - _l && y < y2 - _l && y < y3 - _l) ||
        (x > x0 + _l && x > x1 + _l && x > x2 + _l && x > x3 + _l) ||
        (x < x0 - _l && x < x1 - _l && x < x2 - _l && x < x3 - _l)
      ) {
        return false;
      }
      let d = cubicProjectPoint(x0, y0, x1, y1, x2, y2, x3, y3, x, y, null);
      return d <= _l / 2;
    }
    function cubicProjectPoint(x0, y0, x1, y1, x2, y2, x3, y3, x, y, out) {
      var t;
      var interval = 0.005;
      var EPSILON_NUMERIC = 1e-4;
      var d = Infinity;
      var prev;
      var next;
      var d1;
      var d2;
      var _v0 = [],
        _v1 = [],
        _v2 = [];
      _v0[0] = x;
      _v0[1] = y;
      for (var _t = 0; _t < 1; _t += 0.05) {
        _v1[0] = cubicAt(x0, x1, x2, x3, _t);
        _v1[1] = cubicAt(y0, y1, y2, y3, _t);
        d1 = distanceSquare(_v0, _v1);
        if (d1 < d) {
          t = _t;
          d = d1;
        }
      }
      d = Infinity;
      for (var i = 0; i < 32; i++) {
        if (interval < EPSILON_NUMERIC) {
          break;
        }
        prev = t - interval;
        next = t + interval;
        _v1[0] = cubicAt(x0, x1, x2, x3, prev);
        _v1[1] = cubicAt(y0, y1, y2, y3, prev);
        d1 = distanceSquare(_v1, _v0);
        if (prev >= 0 && d1 < d) {
          t = prev;
          d = d1;
        } else {
          _v2[0] = cubicAt(x0, x1, x2, x3, next);
          _v2[1] = cubicAt(y0, y1, y2, y3, next);
          d2 = distanceSquare(_v2, _v0);
          if (next <= 1 && d2 < d) {
            t = next;
            d = d2;
          } else {
            interval *= 0.5;
          }
        }
      }
      if (out) {
        out[0] = cubicAt(x0, x1, x2, x3, t);
        out[1] = cubicAt(y0, y1, y2, y3, t);
      }
      return Math.sqrt(d);
    }
    function containQuadraticStroke(x0, y0, x1, y1, x2, y2, lineWidth, x, y) {
      if (lineWidth === 0) {
        return false;
      }
      let _l = lineWidth;
      if (
        (y > y0 + _l && y > y1 + _l && y > y2 + _l) ||
        (y < y0 - _l && y < y1 - _l && y < y2 - _l) ||
        (x > x0 + _l && x > x1 + _l && x > x2 + _l) ||
        (x < x0 - _l && x < x1 - _l && x < x2 - _l)
      ) {
        return false;
      }
      let d = quadraticProjectPoint(x0, y0, x1, y1, x2, y2, x, y, null);
      return d <= _l / 2;
    }
    function quadraticProjectPoint(x0, y0, x1, y1, x2, y2, x, y, out) {
      var t;
      var interval = 0.005;
      var EPSILON_NUMERIC = 1e-4;
      var d = Infinity;
      var d1 = 0;
      var _v0 = [],
        _v1 = [],
        _v2 = [];
      _v0[0] = x;
      _v0[1] = y;
      for (var _t = 0; _t < 1; _t += 0.05) {
        _v1[0] = quadraticAt(x0, x1, x2, _t);
        _v1[1] = quadraticAt(y0, y1, y2, _t);
        d1 = distanceSquare(_v0, _v1);
        if (d1 < d) {
          t = _t;
          d = d1;
        }
      }
      d = Infinity;
      for (var i = 0; i < 32; i++) {
        if (interval < EPSILON_NUMERIC) {
          break;
        }
        var prev = t - interval;
        var next = t + interval;
        _v1[0] = quadraticAt(x0, x1, x2, prev);
        _v1[1] = quadraticAt(y0, y1, y2, prev);
        d1 = distanceSquare(_v1, _v0);
        if (prev >= 0 && d1 < d) {
          t = prev;
          d = d1;
        } else {
          _v2[0] = quadraticAt(x0, x1, x2, next);
          _v2[1] = quadraticAt(y0, y1, y2, next);
          var d2 = distanceSquare(_v2, _v0);
          if (next <= 1 && d2 < d) {
            t = next;
            d = d2;
          } else {
            interval *= 0.5;
          }
        }
      }
      if (out) {
        out[0] = quadraticAt(x0, x1, x2, t);
        out[1] = quadraticAt(y0, y1, y2, t);
      }
      return Math.sqrt(d);
    }
    function distanceSquare(v1, v2) {
      return (
        (v1[0] - v2[0]) * (v1[0] - v2[0]) + (v1[1] - v2[1]) * (v1[1] - v2[1])
      );
    }
    function cubicAt(p0, p1, p2, p3, t) {
      var onet = 1 - t;
      return (
        onet * onet * (onet * p0 + 3 * t * p1) +
        t * t * (t * p3 + 3 * onet * p2)
      );
    }
    function quadraticAt(p0, p1, p2, t) {
      var onet = 1 - t;
      return onet * (onet * p0 + 2 * t * p1) + t * t * p2;
    }
    function near(x, y, x1, y1, radius) {
      let distance = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));
      return distance <= radius;
    }
    function getSelfLoopControlPoints(x, y, size) {
      return { x1: x + size * 7, y1: y, x2: x, y2: y - size * 7 };
    }
    function getPointOnBezierCurve(t, x1, y1, x2, y2, cx, cy, dx, dy) {
      var B0_t = Math.pow(1 - t, 3),
        B1_t = 3 * t * Math.pow(1 - t, 2),
        B2_t = 3 * Math.pow(t, 2) * (1 - t),
        B3_t = Math.pow(t, 3);
      return {
        x: B0_t * x1 + B1_t * cx + B2_t * dx + B3_t * x2,
        y: B0_t * y1 + B1_t * cy + B2_t * dy + B3_t * y2,
      };
    }
    function getQuadraticControlPoint(x1, y1, x2, y2, curverNum, curveness) {
      curveness = curveness || 0.5;
      return {
        x: (x1 + x2) * curveness + (y2 - y1) / (curverNum || 4),
        y: (y1 + y2) * curveness + (x1 - x2) / (curverNum || 4),
      };
    }
    function getPointOnQuadraticCurve(t, x1, y1, x2, y2, xi, yi) {
      return {
        x: Math.pow(1 - t, 2) * x1 + 2 * (1 - t) * t * xi + Math.pow(t, 2) * x2,
        y: Math.pow(1 - t, 2) * y1 + 2 * (1 - t) * t * yi + Math.pow(t, 2) * y2,
      };
    }
    function isInPolygon(checkPoint, polygonPoints) {
      var counter = 0;
      var i;
      var xinters;
      var p1, p2;
      var pointCount = polygonPoints.length;
      p1 = polygonPoints[0];
      for (i = 1; i <= pointCount; i++) {
        p2 = polygonPoints[i % pointCount];
        if (
          checkPoint[0] > Math.min(p1[0], p2[0]) &&
          checkPoint[0] <= Math.max(p1[0], p2[0])
        ) {
          if (checkPoint[1] <= Math.max(p1[1], p2[1])) {
            if (p1[0] != p2[0]) {
              xinters =
                ((checkPoint[0] - p1[0]) * (p2[1] - p1[1])) / (p2[0] - p1[0]) +
                p1[1];
              if (p1[1] == p2[1] || checkPoint[1] <= xinters) {
                counter++;
              }
            }
          }
        }
        p1 = p2;
      }
      if (counter % 2 == 0) {
        return false;
      } else {
        return true;
      }
    }
    function findDotsAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
      var t1 = 1 - t,
        t13 = Math.pow(t1, 3),
        t12 = Math.pow(t1, 2),
        t2 = t * t,
        t3 = t2 * t,
        x = t13 * p1x + t12 * 3 * t * c1x + t1 * 3 * t * t * c2x + t3 * p2x,
        y = t13 * p1y + t12 * 3 * t * c1y + t1 * 3 * t * t * c2y + t3 * p2y,
        mx = p1x + 2 * t * (c1x - p1x) + t2 * (c2x - 2 * c1x + p1x),
        my = p1y + 2 * t * (c1y - p1y) + t2 * (c2y - 2 * c1y + p1y),
        nx = c1x + 2 * t * (c2x - c1x) + t2 * (p2x - 2 * c2x + c1x),
        ny = c1y + 2 * t * (c2y - c1y) + t2 * (p2y - 2 * c2y + c1y),
        ax = t1 * p1x + t * c1x,
        ay = t1 * p1y + t * c1y,
        cx = t1 * c2x + t * p2x,
        cy = t1 * c2y + t * p2y,
        alpha = 90 - (Math.atan2(mx - nx, my - ny) * 180) / Math.PI;
      (mx > nx || my < ny) && (alpha += 180);
      return {
        x: x,
        y: y,
        m: { x: mx, y: my },
        n: { x: nx, y: ny },
        start: { x: ax, y: ay },
        end: { x: cx, y: cy },
        alpha: alpha,
      };
    }
    function calPointOnCircle(x, y, radius, percentage) {
      var angle = percentage * 2 * Math.PI;
      return {
        x: x + radius * Math.cos(angle),
        y: y - radius * Math.sin(angle),
      };
    }
    function calculateAngle(sx, sy, tx, ty) {
      var x = Math.abs(sx - tx);
      var y = Math.abs(sy - ty);
      var z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
      var radina = Math.acos(y / z);
      var angle = Math.floor(180 / (Math.PI / radina));
      if (tx > sx && ty > sy) {
        angle = 180 - angle;
      }
      if (tx == sx && ty > sy) {
        angle = 180;
      }
      if (tx > sx && ty == sy) {
        angle = 90;
      }
      if (tx < sx && ty > sy) {
        angle = 180 + angle;
      }
      if (tx < sx && ty == sy) {
        angle = 270;
      }
      if (tx < sx && ty < sy) {
        angle = 360 - angle;
      }
      return angle;
    }
    (requestAnimationFrame =
      window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      function (callback) {
        setTimeout(callback, 1000 / 60);
      }),
      (Array.prototype.del = function (ele) {
        if ('number' != typeof ele) {
          for (var i = 0; i < this.length; i++)
            if (this[i] === ele)
              return this.slice(0, i).concat(this.slice(i + 1, this.length));
          return this;
        }
        return 0 > ele
          ? this
          : this.slice(0, ele).concat(this.slice(ele + 1, this.length));
      }),
      [].indexOf ||
        (Array.prototype.indexOf = function (ele) {
          for (var i = 0; i < this.length; i++) if (this[i] === ele) return i;
          return -1;
        });
    DGraph.util = {
      getDistance: getDistance,
      MessageBus: MessageBus,
      isFirefox: navigator.userAgent.indexOf('Firefox') > 0,
      isIE: !(
        !window.attachEvent || -1 !== navigator.userAgent.indexOf('Opera')
      ),
      isChrome: null != navigator.userAgent.toLowerCase().match(/chrome/),
      clone: clone,
      isPointInLine: isPointInLine,
      removeFromArray: removeFromArray,
      getEventPosition: getEventPosition,
      cloneEvent: cloneEvent,
      getOffsetPosition: getOffsetPosition,
      lineVir: lineVir,
      intersection: intersection,
      intersectionLineBound: intersectionLineBound,
      pointOnCircle: pointOnCircle,
      calPointOnCircle: calPointOnCircle,
      findAngle: findAngle,
      containStroke: containStroke,
      containBerzierStroke: containBerzierStroke,
      containQuadraticStroke: containQuadraticStroke,
      near: near,
      isInPolygon: isInPolygon,
      findDotsAtSegment: findDotsAtSegment,
      getSelfLoopControlPoints: getSelfLoopControlPoints,
      getPointOnBezierCurve: getPointOnBezierCurve,
      getQuadraticControlPoint: getQuadraticControlPoint,
      getPointOnQuadraticCurve: getPointOnQuadraticCurve,
      calculateAngle: calculateAngle,
    };
    CanvasRenderingContext2D.prototype.DGraphRoundRect = function (
      x,
      y,
      width,
      height,
      borderRadius
    ) {
      if ('undefined' == typeof borderRadius) {
        if (width < 2 * borderRadius) {
          borderRadius = width / 2;
        }
        if (height < 2 * borderRadius) {
          borderRadius = hieght / 2;
        }
        this.beginPath();
        this.rect(x, y, width, height);
        this.closePath();
      } else {
        if (width < 2 * borderRadius) {
          borderRadius = width / 2;
        }
        if (height < 2 * borderRadius) {
          borderRadius = height / 2;
        }
        this.beginPath();
        this.moveTo(x + borderRadius, y);
        this.arcTo(x + width, y, x + width, y + height, borderRadius);
        this.arcTo(x + width, y + height, x, y + height, borderRadius);
        this.arcTo(x, y + height, x, y, borderRadius);
        this.arcTo(x, y, x + width, y, borderRadius);
        this.closePath();
      }
    };
    CanvasRenderingContext2D.prototype.drawArrowLine = function (
      x0,
      y0,
      x1,
      y1,
      width
    ) {
      if (width === void 0) {
        width = 3;
      }
      if (width < 3) width = 3;
      var polarCoordinate2canvasCoordinate = function (x0, y0, r, radian) {
        var x = r * Math.cos(radian);
        var y = r * Math.sin(radian);
        x += x0;
        y += y0;
        return { x: x, y: y };
      };
      var distance = Math.sqrt((y1 - y0) * (y1 - y0) + (x1 - x0) * (x1 - x0));
      var radian = Math.asin(Math.abs(y1 - y0) / distance);
      if (x0 > x1 && y1 > y0) {
        radian = Math.PI - radian;
      } else if (x0 > x1 && y0 > y1) {
        radian += Math.PI;
      } else if (x1 > x0 && y0 > y1) {
        radian = 2 * Math.PI - radian;
      }
      var _a = polarCoordinate2canvasCoordinate(
          x0,
          y0,
          distance - width * 2,
          radian
        ),
        x = _a.x,
        y = _a.y;
      var p1 = polarCoordinate2canvasCoordinate(
        x,
        y,
        width,
        radian - Math.PI * 0.5
      );
      var p2 = polarCoordinate2canvasCoordinate(
        x,
        y,
        width * 2,
        radian - Math.PI * 0.5
      );
      var p3 = polarCoordinate2canvasCoordinate(
        x,
        y,
        width,
        radian + Math.PI * 0.5
      );
      var p4 = polarCoordinate2canvasCoordinate(
        x,
        y,
        width * 2,
        radian + Math.PI * 0.5
      );
      this.moveTo(x0, y0);
      this.lineTo(p1.x, p1.y);
      this.lineTo(p2.x, p2.y);
      this.lineTo(x1, y1);
      this.lineTo(p4.x, p4.y);
      this.lineTo(p3.x, p3.y);
      this.closePath();
    };
    CanvasRenderingContext2D.prototype.arrow = function (
      startX,
      startY,
      endX,
      endY,
      controlPoints
    ) {
      var dx = endX - startX;
      var dy = endY - startY;
      var len = Math.sqrt(dx * dx + dy * dy);
      var sin = dy / len;
      var cos = dx / len;
      var a = [];
      a.push(0, 0);
      for (var i = 0; i < controlPoints.length; i += 2) {
        var x = controlPoints[i];
        var y = controlPoints[i + 1];
        a.push(x < 0 ? len + x : x, y);
      }
      a.push(len, 0);
      for (var i = controlPoints.length; i > 0; i -= 2) {
        var x = controlPoints[i - 2];
        var y = controlPoints[i - 1];
        a.push(x < 0 ? len + x : x, -y);
      }
      a.push(0, 0);
      for (var i = 0; i < a.length; i += 2) {
        var x = a[i] * cos - a[i + 1] * sin + startX;
        var y = a[i] * sin + a[i + 1] * cos + startY;
        if (i === 0) this.moveTo(x, y);
        else this.lineTo(x, y);
      }
    };
  })(DGraph),
    (function (DGraph) {
      function Thumbnail(stage, miniMapConfig) {
        (this.padding = 0),
          (this.visible = false),
          (this.container = null),
          (this.canvas = null),
          (this.viewBox = null),
          (this.thumbnailCtx = null),
          (this.width = miniMapConfig.width),
          (this.height = miniMapConfig.height);
        this.viewOffset = { x: 0, y: 0 };
        this.initialize = function () {
          var container = document.createElement('div');
          container.className = 'thumbnail';
          container.style.cssText = `position:absolute;width:${this.width}px;height:${this.height}px;border:1px solid#e1d2d2;background-color:transparent;overflow:hidden;cursor:move;user-select:none;-webkit-user-drag:none;-webkit-tap-highlight-color:rgba(0,0,0 0);`;
          var viewportCvs = document.createElement('canvas');
          viewportCvs.style.cssText =
            'width:100%;height:100%;background-color:transparent;';
          viewportCvs.width = this.width * stage.pixelRatio;
          viewportCvs.height = this.height * stage.pixelRatio;
          var miniMapContainer = miniMapConfig.container;
          var viewContainer = document.getElementById(miniMapContainer);
          if (viewContainer) {
            viewContainer.style.position = 'relative';
            viewContainer.appendChild(container);
            container.style.left = 0;
            container.style.top = 0;
          } else {
            stage.canvas.parentNode.style.position = 'relative';
            stage.canvas.parentNode.appendChild(container);
            container.style.right = 0;
            container.style.bottom = 0;
          }
          container.appendChild(viewportCvs);
          var viewBox = document.createElement('div');
          viewBox.style.cssText = `position:absolute;top:0px;left:0px;height:${this.height}px;width:${this.width}px;border:1px solid ${miniMapConfig.viewColor};`;
          container.appendChild(viewBox);
          this.container = container;
          this.canvas = viewportCvs;
          this.thumbnailCtx = viewportCvs.getContext('2d');
          this.viewBox = viewBox;
          this.addThumbEvents();
        };
        (this.mouseEventConvert = function (event) {
          var mouse = DGraph.util.getEventPosition(event);
          var offset = DGraph.util.getOffsetPosition(this.canvas);
          return (
            (mouse.offsetLeft = mouse.pageX - offset.left),
            (mouse.offsetTop = mouse.pageY - offset.top),
            (mouse.x = mouse.offsetLeft * stage.pixelRatio),
            (mouse.y = mouse.offsetTop * stage.pixelRatio),
            (mouse.target = null),
            mouse
          );
        }),
          (this.addThumbEvents = function () {
            var self = this;
            var smouseX = 0,
              smouseY = 0;
            var emouseX = 0,
              emouseY = 0;
            var lastTranslateX = 0,
              lastTranslateY = 0;
            var isDrag = false;
            this.container.addEventListener('mousedown', function (event) {
              isDrag = true;
              var mouse = {
                x: event.clientX - self.container.offsetLeft,
                y: event.clientY - self.container.offsetTop,
              };
              smouseX = mouse.x;
              smouseY = mouse.y;
              var sence = stage.childs[0];
              lastTranslateX = sence.translateX;
              lastTranslateY = sence.translateY;
            });
            this.container.addEventListener('mouseup', function (event) {
              isDrag = false;
              stage.needRepaint = false;
            });
            this.container.addEventListener('mouseout', function (event) {
              isDrag = false;
              stage.needRepaint = false;
            });
            this.container.addEventListener('mousemove', function (event) {
              if (isDrag) {
                var mouse = {
                  x: event.clientX - self.container.offsetLeft,
                  y: event.clientY - self.container.offsetTop,
                };
                emouseX = mouse.x;
                emouseY = mouse.y;
                var dx = emouseX - smouseX;
                var dy = emouseY - smouseY;
                var scaleX = self.width / stage.canvas.width;
                var scaleY = self.height / stage.canvas.height;
                var sence = stage.childs[0];
                (sence.translateX = lastTranslateX - dx / scaleX),
                  (sence.translateY = lastTranslateY - dy / scaleY);
                stage.needRepaint = true;
              }
            });
          });
        this.destory = function () {
          this.visible = false;
          if (this.container) {
            this.container.removeEventListener(
              'mousedown',
              function () {},
              false
            );
            this.container.removeEventListener(
              'mouseup',
              function () {},
              false
            );
            this.container.removeEventListener(
              'mouseout',
              function () {},
              false
            );
            this.container.removeEventListener(
              'mousemove',
              function () {},
              false
            );
            this.container.parentNode.removeChild(this.container);
            this.container = null;
            this.canvas = null;
            this.thumbnailCtx = null;
          }
        };
        this.show = function () {
          var self = this;
          if (!this.visible && this.container == null) {
            this.initialize();
            this.visible = true;
            setTimeout(function () {
              self.update();
              self.paint();
            }, 1000);
          }
        };
        (this.update = function () {
          var bound = stage.getBound();
          if (bound == null || bound.width < 0) {
            return null;
          }
          var scene = stage.childs[0];
          var scale = Math.min(
            this.width / bound.width,
            this.height / bound.height
          );
          var ctx = this.thumbnailCtx;
          ctx.save(),
            ctx.clearRect(0, 0, this.width, this.height),
            scene.save(),
            scene.centerAndZoom(scale, scale, ctx),
            scene.paintNodes(ctx),
            (this.viewOffset = {
              x: scene.translateX * scale,
              y: scene.translateY * scale,
            });
          scene.restore();
          ctx.restore();
        }),
          (this.paint = function () {
            if (!this.visible) {
              return;
            }
            var bound = stage.getBound();
            if (bound == null || bound.width < 0) {
              return null;
            }
            var scene = stage.childs[0];
            var scaleX = scene.scaleX,
              scaleY = scene.scaleY;
            var stageWidth = stage.canvas.width;
            var stageHeight = stage.canvas.height;
            var sWidth = stageWidth / 2;
            var sHeight = stageHeight / 2;
            var offsetX = scene.translateX;
            var offsetY = scene.translateY;
            var offset = {
              translateX: offsetX + sWidth / scaleX - sWidth,
              translateY: offsetY + sHeight / scaleY - sHeight,
            };
            var x = offset.translateX * (this.width / stageWidth) * scaleX;
            var y = offset.translateY * (this.height / stageHeight) * scaleY;
            var boundWidth = bound.width;
            var boundHeight = bound.height;
            scaleX = stageWidth / (boundWidth * scaleX);
            scaleY = stageHeight / (boundHeight * scaleY);
            scaleX > 1 && (scaleX = 1);
            scaleY > 1 && (scaleY = 1);
            x *= scaleX;
            y *= scaleY;
            x -= 10;
            y -= 10;
            var rectWidth = this.width * scaleX;
            var rectHeight = this.height * scaleY;
            this.viewBox.style.width = `${rectWidth}px`;
            this.viewBox.style.height = `${rectHeight}px`;
            this.viewBox.style.left = `${-x}px`;
            this.viewBox.style.top = `${-y}px`;
          });
      }
      function Stage(container, miniMapConfig) {
        var self = this;
        let canvas = document.createElement('canvas');
        canvas.style.position = 'relative';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
        let ratio = getRatio(canvas);
        canvas.width = Math.round(canvas.clientWidth * ratio);
        canvas.height = Math.round(canvas.clientHeight * ratio);
        let offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        canvas.oncontextmenu = function (e) {
          if (e.button == 2) {
            e.preventDefault();
            return false;
          }
        };
        window.addEventListener('resize', function (event) {
          self.resize();
        });
        function mouseEvent(event) {
          var mouse = DGraph.util.getEventPosition(event),
            offset = DGraph.util.getOffsetPosition(self.canvas);
          return (
            (mouse.offsetLeft = mouse.pageX - offset.left),
            (mouse.offsetTop = mouse.pageY - offset.top),
            (mouse.x = mouse.offsetLeft * ratio),
            (mouse.y = mouse.offsetTop * ratio),
            (mouse.target = null),
            mouse
          );
        }
        function getRatio(canvas) {
          let ctx = canvas.getContext('2d');
          if (ctx === undefined) {
            return;
          }
          var numerator = 1;
          if (typeof window !== 'undefined') {
            numerator = window.devicePixelRatio || 1.0;
          }
          var denominator =
            ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio ||
            1.0;
          return numerator / denominator;
        }
        function mouseover(event) {
          (document.onselectstart = function () {
            return false;
          }),
            (this.mouseOver = true);
          var _mouseEvent = mouseEvent(event);
          self.dispatchEventToScenes('mouseover', _mouseEvent),
            self.dispatchEvent('mouseover', _mouseEvent);
        }
        function mouseout(event) {
          document.onselectstart = function () {
            return true;
          };
          var _mouseEvent = mouseEvent(event);
          self.dispatchEventToScenes('mouseout', _mouseEvent),
            self.dispatchEvent('mouseout', _mouseEvent),
            (self.needRepaint = false);
        }
        function mousedown(event) {
          var _mouseEvent = mouseEvent(event);
          (self.mouseDown = true),
            (self.mouseDownX = _mouseEvent.x),
            (self.mouseDownY = _mouseEvent.y),
            self.dispatchEventToScenes('mousedown', _mouseEvent),
            self.dispatchEvent('mousedown', _mouseEvent);
        }
        function mouseup(event) {
          var _mouseEvent = mouseEvent(event);
          self.dispatchEventToScenes('mouseup', _mouseEvent),
            self.dispatchEvent('mouseup', _mouseEvent),
            (self.mouseDown = false),
            (self.needRepaint = false);
          self.thumbnail.visible && self.thumbnail.update();
        }
        function mousemove(event) {
          var _mouseEvent = mouseEvent(event);
          if (self.mouseDown) {
            0 == event.button;
            (_mouseEvent.dx = _mouseEvent.x - self.mouseDownX),
              (_mouseEvent.dy = _mouseEvent.y - self.mouseDownY),
              self.dispatchEventToScenes('mousedrag', _mouseEvent),
              self.dispatchEvent('mousedrag', _mouseEvent);
          } else {
            self.dispatchEventToScenes('mousemove', _mouseEvent),
              self.dispatchEvent('mousemove', _mouseEvent);
          }
        }
        function click(event) {
          event.preventDefault();
          var _mouseEvent = mouseEvent(event);
          self.dispatchEventToScenes('click', _mouseEvent),
            self.dispatchEvent('click', _mouseEvent);
        }
        function dblclick(event) {
          event.preventDefault();
          var _mouseEvent = mouseEvent(event);
          self.dispatchEventToScenes('dbclick', _mouseEvent),
            self.dispatchEvent('dbclick', _mouseEvent);
        }
        function mousewheel(event) {
          var _mouseEvent = mouseEvent(event);
          self.dispatchEventToScenes('mousewheel', _mouseEvent),
            self.dispatchEvent('mousewheel', _mouseEvent),
            null != self.wheelZoom &&
              (event.preventDefault
                ? event.preventDefault()
                : (window.event, (event.returnValue = false)),
              self.thumbnail.visible && self.thumbnail.paint());
        }
        function touchmove(event) {
          event.preventDefault();
          if (self.istouch) {
            if (event.touches && event.touches.length < 2) {
              mousemove(touchEventToMouseEvent(event, 'mousemove'));
            } else {
              event.preventDefault();
              const touches = event.touches;
              var now = touches;
              var start = self.touchStart;
              if (
                getDistance(now[0], now[1]) < getDistance(start[0], start[1])
              ) {
                self.zoomIn(0.95);
              } else if (
                getDistance(now[0], now[1]) > getDistance(start[0], start[1])
              ) {
                self.zoomOut(0.95);
              }
              self.touchStart = now;
            }
          } else {
            mousemove(touchEventToMouseEvent(event, 'mousemove'));
          }
          function getDistance(p1, p2) {
            var x = p2.pageX - p1.pageX,
              y = p2.pageY - p1.pageY;
            return Math.sqrt(x * x + y * y);
          }
        }
        function touchstart(event) {
          self.istouch = true;
          if (event.touches && event.touches.length < 2) {
            mousedown(touchEventToMouseEvent(event, 'mousedown'));
          } else {
            const touches = event.touches;
            if (touches.length >= 2) {
              self.touchStart = touches;
            }
          }
        }
        function touchend(event) {
          if (self.istouch) {
            self.istouch = false;
            self.touchStart = null;
            mouseup(touchEventToMouseEvent(event, 'mousedown'));
          }
        }
        function touchEventToMouseEvent(event, eventType) {
          if (!event.changedTouches || event.changedTouches.length != 1) {
            return false;
          }
          var te = event.changedTouches[0];
          var clientX = te.clientX,
            clientY = te.clientY,
            screenX = te.screenX,
            screenY = te.screenY;
          var simEvent = new MouseEvent(eventType, {
            clientX: clientX,
            clientY: clientY,
            screenX: screenX,
            screenY: screenY,
            button: 0,
            buttons: 0,
          });
          return simEvent;
        }
        function initEvents(cavs) {
          DGraph.util.isIE || !window.addEventListener
            ? ((cavs.onmouseout = mouseout),
              (cavs.onmouseover = mouseover),
              (cavs.onmousedown = mousedown),
              (cavs.onmouseup = mouseup),
              (cavs.onmousemove = mousemove),
              (cavs.onclick = click),
              (cavs.ondblclick = dblclick),
              (cavs.onmousewheel = mousewheel),
              (cavs.touchstart = touchstart),
              (cavs.touchmove = touchmove),
              (cavs.touchend = touchend))
            : (cavs.addEventListener('mouseout', mouseout),
              cavs.addEventListener('mouseover', mouseover),
              cavs.addEventListener('mousedown', mousedown),
              cavs.addEventListener('mouseup', mouseup),
              cavs.addEventListener('mousemove', mousemove),
              cavs.addEventListener('click', click),
              cavs.addEventListener('dblclick', dblclick),
              cavs.addEventListener('touchstart', touchstart),
              cavs.addEventListener('touchmove', touchmove),
              cavs.addEventListener('touchend', touchend),
              DGraph.util.isFirefox
                ? cavs.addEventListener('DOMMouseScroll', mousewheel)
                : cavs.addEventListener('mousewheel', mousewheel));
        }
        (this.initialize = function (_canvas, offCanvas) {
          initEvents(_canvas), (this.canvas = _canvas);
          this.stageContext = _canvas.getContext('2d');
          this.offCanvas = offCanvas;
          this.graphics = offCanvas.getContext('2d');
          (this.childs = []),
            (this.fps = -25),
            (this.messageBus = new DGraph.util.MessageBus()),
            (this.wheelZoom = null),
            (this.mouseDownX = 0),
            (this.mouseDownY = 0),
            (this.mouseDown = false),
            (this.mouseOver = false),
            (this.needRepaint = true),
            (this.istouch = false),
            (this.touchStart = null),
            (this.repainting = false);
          this.pixelRatio = getRatio(_canvas);
          this.thumbnail = new Thumbnail(this, miniMapConfig);
          (this.getPixelColor = function (x, y) {
            var imageData = this.graphics.getImageData(x, y, 1, 1);
            var pixel = imageData.data;
            var r = pixel[0];
            var g = pixel[1];
            var b = pixel[2];
            var a = Math.round((pixel[3] / 255) * 100) / 100;
            return { r: r, g: g, b: b, a: a };
          }),
            (this.resize = function () {
              var nowWidth = Math.round(
                this.canvas.clientWidth * this.pixelRatio
              );
              var nowHeight = Math.round(
                this.canvas.clientHeight * this.pixelRatio
              );
              if (
                this.canvas.width != nowWidth ||
                this.canvas.height != nowHeight
              ) {
                this.canvas.width = nowWidth;
                this.canvas.height = nowHeight;
                this.offCanvas.width = nowWidth;
                this.offCanvas.height = nowHeight;
                this.paint();
              }
            }),
            (this.dispatchEventToScenes = function (eventName, mouse) {
              this.needRepaint = true;
              this.childs.forEach(function (item) {
                if (item.visible == true) {
                  var event = item[eventName + 'Handler'];
                  if (null == event) return null;
                  event.call(item, mouse);
                }
              });
            }),
            (this.add = function (sence) {
              for (var i = 0; i < this.childs.length; i++)
                if (this.childs[i] === sence) return;
              sence.addTo(this), this.childs.push(sence);
            }),
            (this.remove = function (sence) {
              if (null == sence) return null;
              for (var i = 0; i < this.childs.length; i++)
                if (this.childs[i] === sence)
                  return (
                    (sence.stage = null),
                    (this.childs = this.childs.del(i)),
                    this
                  );
              return this;
            }),
            (this.clear = function () {
              this.childs = [];
            }),
            (this.addEventListener = function (eventName, eventFunction) {
              var self = this,
                fn = function (event) {
                  eventFunction.call(self, event);
                };
              return this.messageBus.subscribe(eventName, fn), this;
            }),
            (this.removeEventListener = function (eventName) {
              this.messageBus.unsubscribe(eventName);
            }),
            (this.removeAllEventListener = function () {
              this.messageBus = new DGraph.util.MessageBus();
            }),
            (this.dispatchEvent = function (eventName, event) {
              return this.messageBus.publish(eventName, event), this;
            });
        }),
          this.initialize(canvas, offCanvas);
        var eventNames = [
          'click',
          'dbclick',
          'mousedown',
          'mouseup',
          'mouseover',
          'mouseout',
          'mousemove',
          'mousedrag',
          'mousewheel',
        ];
        eventNames.forEach(function (eventName) {
          self[eventName] = function (event) {
            null != event
              ? this.addEventListener(eventName, event)
              : this.dispatchEvent(eventName);
          };
        });
        (this.getPagePosition = function (x, y) {
          var self = this;
          if (!this.childs || this.childs.length == 0) {
            return { pageX: 0, pageY: 0 };
          }
          var secne = this.childs && this.childs[0];
          var secneOffset = secne.getOffsetTranslate();
          var offset = DGraph.util.getOffsetPosition(self.canvas);
          var offsetLeft =
            ((x + secneOffset.translateX) * secne.scaleX) / self.pixelRatio;
          var offsetTop =
            ((y + secneOffset.translateY) * secne.scaleY) / self.pixelRatio;
          return {
            pageX: offsetLeft + offset.left,
            pageY: offsetTop + offset.top,
          };
        }),
          (this.getImageUrlData = function (imageWidth, imageHeight, type) {
            var bound = this.getBound();
            if (bound == null || bound.width < 0) {
              return null;
            }
            var rectWidth = bound.width,
              rectHeight = bound.height;
            var paddingX = 0,
              paddingY = 0;
            if (
              bound.leftNode.elementType == 'node' &&
              bound.rightNode.elementType == 'node'
            ) {
              paddingX =
                bound.leftNode.radius * bound.leftNode.scaleX +
                bound.rightNode.radius * bound.rightNode.scaleX;
              paddingY =
                bound.topNode.radius * bound.topNode.scaleY +
                bound.bottomNode.radius * bound.bottomNode.scaleY;
            }
            rectWidth += paddingX;
            rectHeight += paddingY;
            var exportCanvas = document.createElement('canvas');
            var width = Math.min(imageWidth || 10000, rectWidth);
            var height = Math.min(imageHeight || 10000, rectHeight);
            exportCanvas.width = width;
            exportCanvas.height = height;
            var scale = Math.min(width / rectWidth, height / rectHeight);
            if (Math.max(rectWidth, rectHeight) < 500) {
              exportCanvas.width = Math.max(
                Math.max(rectWidth, rectHeight),
                500
              );
              exportCanvas.height = Math.max(
                Math.max(rectWidth, rectHeight),
                500
              );
              scale = 1;
            }
            var ctx = exportCanvas.getContext('2d');
            var scene = this.childs[0];
            scene.save(),
              scene.centerAndZoom(scale, scale, ctx),
              scene.repaint(ctx, true),
              scene.restore();
            var imageObj = null;
            try {
              imageObj = exportCanvas.toDataURL('image/' + (type || 'png'), 1);
            } catch (m) {}
            return imageObj;
          }),
          (this.saveAsLocalImage = function (width, height, type, fileName) {
            type = type ? type : 'png';
            var imageData = this.getImageUrlData(width, height, type || 'png');
            if (imageData != null) {
              var fixtype = function (type) {
                type = type.toLowerCase().replace(/jpg/i, 'jpeg');
                var r = type.match(/png|jpeg|bmp|gif/);
                if (r) {
                  r = r[0];
                }
                return 'image' + r;
              };
              imageData = imageData.replace(
                fixtype(type),
                'image/octet-stream'
              );
              var link = document.createElement('a');
              link.href = imageData;
              link.download =
                (fileName || 'GraphVis_' + new Date().getTime()) + '.' + type;
              var event = document.createEvent('MouseEvents');
              event.initMouseEvent(
                'click',
                true,
                false,
                window,
                0,
                0,
                0,
                0,
                0,
                false,
                false,
                false,
                false,
                0,
                null
              );
              link.dispatchEvent(event);
            }
          }),
          (this.paint = function () {
            if (this.repainting) {
              return;
            }
            this.repainting = true;
            if (null != this.canvas) {
              this.graphics.save();
              this.graphics.clearRect(0, 0, this.width, this.height);
              this.childs.forEach(function (scene) {
                scene.visible && scene.repaint(self.graphics);
              }),
                this.thumbnail.visible && this.thumbnail.paint(this),
                this.graphics.restore();
              this.stageContext.clearRect(0, 0, this.width, this.height);
              this.stageContext.drawImage(this.offCanvas, 0, 0);
            }
            this.repainting = false;
          }),
          (this.repaint = function () {
            0 != this.fps &&
              ((this.fps < 0 && false == this.needRepaint) ||
                (this.paint(), this.fps < 0 && (this.needRepaint = false)));
          }),
          (this.zoom = function (scale) {
            this.childs.forEach(function (child) {
              child.visible && child.zoom(scale);
            });
          }),
          (this.zoomOut = function (scale) {
            this.childs.forEach(function (child) {
              child.visible && child.zoomOut(scale);
            });
          }),
          (this.zoomIn = function (scale) {
            this.childs.forEach(function (child) {
              child.visible && child.zoomIn(scale);
            });
          }),
          (this.centerAndZoom = function () {
            this.childs.forEach(function (child) {
              child.visible && child.centerAndZoom();
            });
          }),
          (this.setCenter = function (x, y) {
            var self = this;
            this.childs.forEach(function (child) {
              var translateX = x - self.canvas.width / 2,
                translateY = y - self.canvas.height / 2;
              (child.translateX = -translateX),
                (child.translateY = -translateY);
            });
          }),
          (this.getBound = function () {
            var bound = {
              left: Number.MAX_VALUE,
              right: Number.MIN_VALUE,
              top: Number.MAX_VALUE,
              bottom: Number.MIN_VALUE,
            };
            if (this.childs.length == 0 || this.childs[0].childs == 0) {
              return null;
            }
            return (
              this.childs.forEach(function (child) {
                var _cbound = child.getElementsBound();
                _cbound.left < bound.left &&
                  ((bound.left = _cbound.left),
                  (bound.leftNode = _cbound.leftNode)),
                  _cbound.top < bound.top &&
                    ((bound.top = _cbound.top),
                    (bound.topNode = _cbound.topNode)),
                  _cbound.right > bound.right &&
                    ((bound.right = _cbound.right),
                    (bound.rightNode = _cbound.rightNode)),
                  _cbound.bottom > bound.bottom &&
                    ((bound.bottom = _cbound.bottom),
                    (bound.bottomNode = _cbound.bottomNode));
              }),
              (bound.width = bound.right - bound.left),
              (bound.height = bound.bottom - bound.top),
              bound
            );
          }),
          (function () {
            if (0 == self.fps) {
              setTimeout(arguments.callee, 100);
            } else if (self.fps < 0) {
              self.repaint(), setTimeout(arguments.callee, 1000 / -self.fps);
            } else {
              self.repaint(), setTimeout(arguments.callee, 1000 / self.fps);
            }
          })(),
          setTimeout(function () {
            self.mousewheel(function (event) {
              var wheelDelta =
                null == event.wheelDelta ? event.detail : event.wheelDelta;
              null != self.wheelZoom &&
                (wheelDelta > 0
                  ? self.zoomOut(self.wheelZoom)
                  : self.zoomIn(self.wheelZoom));
            });
          }, 200);
      }
      (Stage.prototype = {
        get width() {
          return this.canvas.width;
        },
        get height() {
          return this.canvas.height;
        },
        set mode(mode) {
          this.childs.forEach(function (item) {
            item.mode = mode;
          });
        },
      }),
        (DGraph.Stage = Stage);
    })(DGraph),
    (function (DGraph) {
      function Scene(_stage) {
        var self = this;
        (this.initialize = function () {
          Scene.prototype.initialize.apply(this, arguments),
            (this.messageBus = new DGraph.util.MessageBus()),
            (this.elementType = 'scene'),
            (this.childs = []),
            (this.zIndexMap = {}),
            (this.zIndexArray = []),
            (this.backgroundColor = '255,255,255'),
            (this.visible = true),
            (this.alpha = 0),
            (this.scaleX = 1),
            (this.scaleY = 1),
            (this.mode = DGraph.SceneMode.normal),
            (this.translate = true),
            (this.translateX = 0),
            (this.translateY = 0),
            (this.lastTranslateX = 0),
            (this.lastTranslateY = 0),
            (this.mouseDown = false),
            (this.mouseDownX = null),
            (this.mouseDownY = null),
            (this.mouseDownEvent = null),
            (this.areaSelect = true),
            (this.operations = []),
            (this.selectedElements = []),
            (this.serializedProperties = [
              'translateX',
              'translateY',
              'lastTranslatedX',
              'lastTranslatedY',
              'scaleX',
              'scaleY',
            ]);
          (this.setBackground = function (background) {
            this.background = background;
          }),
            (this.addTo = function (stage) {
              this.stage !== stage && null != stage && (this.stage = stage);
            });
        }),
          this.initialize();
        if (null != _stage) {
          _stage.add(this);
          this.addTo(_stage);
        }
        (this.show = function () {
          this.visible = true;
        }),
          (this.hide = function () {
            this.visible = false;
          }),
          (this.paint = function (ctx, allPaint) {
            ctx.save();
            ctx.scale(this.scaleX, this.scaleY);
            if (true == this.translate) {
              var b = this.getOffsetTranslate(ctx);
              ctx.translate(b.translateX, b.translateY);
            }
            if (allPaint) {
              this.paintAllChilds(ctx);
            } else {
              this.paintChilds(ctx);
            }
            ctx.restore(),
              ctx.save(),
              this.paintOperations(ctx, this.operations),
              ctx.restore();
          }),
          (this.repaint = function (ctx, allPaint) {
            this.visible && this.paint(ctx, allPaint);
          }),
          (this.paintBackgroud = function (ctx) {
            if (null != this.background) {
              ctx.drawImage(
                this.background,
                0,
                0,
                ctx.canvas.width,
                ctx.canvas.height
              );
            } else {
              ctx.beginPath(),
                (ctx.fillStyle = `rgba(${this.backgroundColor},${this.alpha})`),
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height),
                ctx.closePath();
            }
          }),
          (this.getDisplayedElements = function () {
            var offset = this.getOffsetTranslate();
            for (var elemets = [], i = 0; i < this.zIndexArray.length; i++) {
              var indexType = this.zIndexArray[i],
                zindex = this.zIndexMap[indexType];
              for (var e = 0; e < zindex.length; e++) {
                var element = zindex[e];
                this.isVisiable(element, offset) && elemets.push(element);
              }
            }
            return elemets;
          }),
          (this.getDisplayedNodes = function () {
            var offset = this.getOffsetTranslate();
            for (var nodes = [], i = 0; i < this.childs.length; i++) {
              var ele = this.childs[i];
              ele instanceof DGraph.Node &&
                this.isVisiable(ele, offset) &&
                nodes.push(ele);
            }
            return nodes;
          }),
          (this.paintChilds = function (ctx) {
            let smallFlag = this.scaleX < 0.05 ? true : false;
            var displayElements = this.getDisplayedElements();
            let nodeArr = [],
              edgeArr = [],
              groupArr = [];
            for (let i = displayElements.length - 1; i >= 0; i--) {
              var el = displayElements[i];
              if (el instanceof DGraph.Node) {
                nodeArr.push(el);
              } else if (el instanceof DGraph.Group) {
                groupArr.push(el);
              } else if (el instanceof DGraph.Edge) {
                if (smallFlag) {
                  continue;
                }
                if (
                  nodeArr.indexOf(el.source) != -1 ||
                  nodeArr.indexOf(el.target) != -1
                ) {
                  edgeArr.push(el);
                }
              }
            }
            let needPaintElemets = groupArr.concat(edgeArr).concat(nodeArr);
            needPaintElemets.forEach(function (ele) {
              if (ele.visible == true) {
                ctx.save();
                if (ele.transformAble) {
                  var position = ele.getCenterLocation();
                  ctx.translate(position.x, position.y);
                  ctx.rotate((ele.rotate * Math.PI) / 180);
                  ctx.scale(ele.scaleX, ele.scaleY);
                }
                if (ele instanceof DGraph.InteractiveElement) {
                  if (ele.isMouseOver) {
                    ele.paintMouseover(ctx);
                  }
                  ele.paint(ctx, smallFlag);
                }
                ctx.restore();
              }
            });
          }),
          (this.paintAllChilds = function (ctx) {
            for (var i = 0; i < this.zIndexArray.length; i++) {
              var d = this.zIndexArray[i],
                e = this.zIndexMap[d];
              for (var f = 0; f < e.length; f++) {
                var ele = e[f];
                if (ele.visible == true) {
                  ctx.save();
                  if (ele.transformAble) {
                    var pos = ele.getCenterLocation();
                    ctx.translate(pos.x, pos.y);
                    ctx.rotate((ele.rotate * Math.PI) / 180);
                    ctx.scale(ele.scaleX, ele.scaleY);
                  }
                  if (ele instanceof DGraph.InteractiveElement) {
                    if (ele.isMouseOver) {
                      ele.paintMouseover(ctx);
                    }
                    ele.paint(ctx, false);
                  }
                  ctx.restore();
                }
              }
            }
          }),
          (this.paintNodes = function (ctx) {
            var nodes = this.childs.filter(function (ele) {
              return ele instanceof DGraph.Node && ele.visible;
            });
            if (!nodes || nodes.length == 0) {
              return false;
            }
            ctx.save();
            ctx.scale(this.scaleX, this.scaleY);
            if (true == this.translate) {
              var offset = this.getOffsetTranslate(ctx);
              ctx.translate(offset.translateX, offset.translateY);
            }
            var pos = { x: 0, y: 0 };
            nodes.forEach(function (child) {
              ctx.save();
              if (child.transformAble) {
                pos = child.getCenterLocation();
                ctx.translate(pos.x, pos.y);
                ctx.rotate((child.rotate * Math.PI) / 180);
                ctx.scale(child.scaleX, child.scaleY);
              }
              child.paint(ctx, true);
              ctx.restore();
            });
            ctx.restore();
          }),
          (this.getOffsetTranslate = function (ctx) {
            var width = this.stage.canvas.width;
            var height = this.stage.canvas.height;
            if (null != ctx) {
              width = ctx.canvas.width;
              height = ctx.canvas.height;
            }
            var offsetX = width / this.scaleX / 2;
            var offsetY = height / this.scaleY / 2;
            return {
              translateX: this.translateX + (offsetX - offsetX * this.scaleX),
              translateY: this.translateY + (offsetY - offsetY * this.scaleY),
            };
          }),
          (this.isVisiable = function (ele, offset) {
            if (ele == null || !ele.visible) {
              return false;
            }
            if (ele instanceof DGraph.Link) {
              if (ele.source.visible && ele.target.visible) {
                return true;
              }
              return false;
            }
            var offsetX = (ele.x + offset.translateX) * this.scaleX;
            var offsetY = (ele.y + offset.translateY) * this.scaleY;
            var width = offsetX + ele.width * this.scaleX;
            var height = offsetY + ele.height * this.scaleY;
            return offsetX > this.stage.canvas.width ||
              offsetY > this.stage.canvas.height ||
              0 > width ||
              0 > height
              ? false
              : true;
          }),
          (this.paintOperations = function (ctx, eles) {
            for (var i = 0; i < eles.length; i++) {
              eles[i](ctx);
            }
          }),
          (this.addOperation = function (operat) {
            return this.operations.push(operat), this;
          }),
          (this.clearOperations = function () {
            return (this.operations = []), this;
          }),
          (this.getElementByXY = function (x, y) {
            var offset = this.getOffsetTranslate();
            var element = null;
            for (var e = this.zIndexArray.length - 1; e >= 0; e--) {
              var f = this.zIndexArray[e];
              var g = this.zIndexMap[f];
              for (var h = g.length - 1; h >= 0; h--) {
                var ele = g[h];
                if (
                  ele instanceof DGraph.InteractiveElement &&
                  this.isVisiable(ele, offset) &&
                  ele.isInBound(x, y)
                ) {
                  return (element = ele);
                }
              }
            }
            return element;
          }),
          (this.add = function (ele) {
            this.childs.push(ele),
              null == this.zIndexMap[ele.zIndex] &&
                ((this.zIndexMap[ele.zIndex] = []),
                this.zIndexArray.push(ele.zIndex),
                this.zIndexArray.sort(function (zindexA, zindexB) {
                  return zindexA - zindexB;
                })),
              this.zIndexMap['' + ele.zIndex].push(ele);
          }),
          (this.remove = function (ele) {
            this.childs = DGraph.util.removeFromArray(this.childs, ele);
            var index = this.zIndexMap[ele.zIndex];
            if (index) {
              this.zIndexMap[ele.zIndex] = DGraph.util.removeFromArray(
                index,
                ele
              );
              ele.removeHandler(this);
            }
          }),
          (this.clear = function () {
            var self = this;
            this.childs.forEach(function (ele) {
              ele.removeHandler(self);
            }),
              (this.childs = []),
              (this.operations = []),
              (this.zIndexArray = []),
              (this.zIndexMap = {});
          }),
          (this.addToSelected = function (ele) {
            this.selectedElements.push(ele);
          }),
          (this.cancleAllSelected = function (ele) {
            for (var i = 0; i < this.selectedElements.length; i++) {
              this.selectedElements[i].unselectedHandler(ele);
            }
            this.selectedElements = [];
          }),
          (this.notInSelectedNodes = function (ele) {
            for (var i = 0; i < this.selectedElements.length; i++) {
              if (ele === this.selectedElements[i]) return false;
            }
            return true;
          }),
          (this.removeFromSelected = function (ele) {
            for (var i = 0; i < this.selectedElements.length; i++) {
              var selEle = this.selectedElements[i];
              if (ele === selEle) {
                this.selectedElements = this.selectedElements.del(i);
              }
            }
          }),
          (this.toSceneEvent = function (ele) {
            var newELe = DGraph.util.clone(ele);
            newELe.x /= this.scaleX;
            newELe.y /= this.scaleY;
            if (true == this.translate) {
              var offset = this.getOffsetTranslate();
              newELe.x -= offset.translateX;
              newELe.y -= offset.translateY;
            }
            return (
              null != newELe.dx &&
                ((newELe.dx /= this.scaleX), (newELe.dy /= this.scaleY)),
              null != this.currentElement &&
                (newELe.target = this.currentElement),
              (newELe.scene = this),
              newELe
            );
          }),
          (this.selectElement = function (event) {
            var self = this;
            var selEle = self.getElementByXY(event.x, event.y);
            if (null != selEle) {
              event.target = selEle;
              selEle.mousedownHander(event);
              selEle.selectedHandler(event);
              if (self.notInSelectedNodes(selEle)) {
                event.ctrlKey || self.cancleAllSelected(),
                  self.addToSelected(selEle);
              } else {
                event.ctrlKey &&
                  (selEle.unselectedHandler(), this.removeFromSelected(selEle));
                for (var i = 0; i < this.selectedElements.length; i++) {
                  this.selectedElements[i].selectedHandler(event);
                }
              }
            } else {
              event.ctrlKey || self.cancleAllSelected();
            }
            this.currentElement = selEle;
          }),
          (this.mousedownHandler = function (event) {
            var evt = this.toSceneEvent(event);
            (this.mouseDownX = evt.x),
              (this.mouseDownY = evt.y),
              (this.mouseDownEvent = evt);
            if (
              (this.mouseDown = true && this.mode == DGraph.SceneMode.normal)
            ) {
              this.selectElement(evt),
                (null == this.currentElement ||
                  this.currentElement instanceof DGraph.Link) &&
                  true == this.translate &&
                  ((this.lastTranslateX = this.translateX),
                  (this.lastTranslateY = this.translateY));
            } else {
              if (this.mode == DGraph.SceneMode.drag && true == this.translate)
                return (
                  (this.lastTranslateX = this.translateX),
                  (this.lastTranslateY = this.translateY)
                );
              this.mode == DGraph.SceneMode.select && this.selectElement(evt);
            }
            self.dispatchEvent('mousedown', evt);
          }),
          (this.mouseupHandler = function (event) {
            self.clearOperations();
            var evt = this.toSceneEvent(event);
            null != this.currentElement &&
              ((evt.target = self.currentElement),
              this.currentElement.mouseupHandler(evt));
            this.dispatchEvent('mouseup', evt), (this.mouseDown = false);
          }),
          (this.dragElements = function (event) {
            if (
              null != this.currentElement &&
              1 == this.currentElement.dragable
            )
              for (var i = 0; i < this.selectedElements.length; i++) {
                var d = this.selectedElements[i];
                if (true == d.dragable) {
                  var e = DGraph.util.clone(event);
                  (e.target = d), d.mousedragHandler(e);
                }
              }
          }),
          (this.mousedragHandler = function (event) {
            var mouse = this.toSceneEvent(event);
            this.mode == DGraph.SceneMode.normal
              ? null == this.currentElement ||
                this.currentElement instanceof DGraph.Link
                ? true == this.translate &&
                  ((this.translateX = this.lastTranslateX + mouse.dx),
                  (this.translateY = this.lastTranslateY + mouse.dy))
                : this.dragElements(mouse)
              : this.mode == DGraph.SceneMode.drag
              ? true == this.translate &&
                ((this.translateX = this.lastTranslateX + mouse.dx),
                (this.translateY = this.lastTranslateY + mouse.dy))
              : this.mode == DGraph.SceneMode.select
              ? null != this.currentElement
                ? true == this.currentElement.dragable &&
                  this.dragElements(mouse)
                : true == this.areaSelect && this.areaSelectHandle(mouse)
              : this.dispatchEvent('mousedrag', mouse);
          }),
          (this.areaSelectHandle = function (event) {
            var left = event.offsetLeft,
              top = event.offsetTop,
              mouseLeft = this.mouseDownEvent.offsetLeft,
              mouseTop = this.mouseDownEvent.offsetTop,
              x = left >= mouseLeft ? mouseLeft : left,
              y = top >= mouseTop ? mouseTop : top,
              dx = Math.abs(event.dx) * this.scaleX,
              dy = Math.abs(event.dy) * this.scaleY,
              area = new SelArea(
                x * this.stage.pixelRatio,
                y * this.stage.pixelRatio,
                dx,
                dy
              );
            self.clearOperations().addOperation(area),
              (left = event.x),
              (top = event.y),
              (mouseLeft = this.mouseDownEvent.x),
              (mouseTop = this.mouseDownEvent.y),
              (x = left >= mouseLeft ? mouseLeft : left),
              (y = top >= mouseTop ? mouseTop : top),
              (dx = Math.abs(event.dx)),
              (dy = Math.abs(event.dy));
            (width = x + dx), (height = y + dy);
            for (var i = 0; i < self.childs.length; i++) {
              var ele = self.childs[i];
              if (ele.elementType == 'link') {
                continue;
              }
              if (
                ele.x > x &&
                ele.x + ele.width < width &&
                ele.y > y &&
                ele.y + ele.height < height &&
                self.notInSelectedNodes(ele)
              ) {
                ele.selectedHandler(event), self.addToSelected(ele);
                if (ele.elementType == 'node') {
                  (ele.inLinks || [])
                    .concat(ele.outLinks || [])
                    .forEach((link) => {
                      if (
                        self.selectedElements.indexOf(link.source) != -1 &&
                        self.selectedElements.indexOf(link.target) != -1
                      ) {
                        link.selected = true;
                        self.addToSelected(link);
                      }
                    });
                }
              }
            }
            function SelArea(x, y, width, height) {
              return function (ctx) {
                ctx.beginPath(),
                  (ctx.strokeStyle = 'rgba(0,225,0,0.8)'),
                  (ctx.fillStyle = 'rgba(0,225,0,0.1)'),
                  ctx.rect(x, y, width, height),
                  ctx.fill(),
                  ctx.stroke(),
                  ctx.closePath();
              };
            }
          }),
          (this.mousemoveHandler = function (event) {
            var mouseEvent = this.toSceneEvent(event);
            var targetEle = self.getElementByXY(mouseEvent.x, mouseEvent.y);
            null != targetEle
              ? (self.mouseOverelement &&
                  self.mouseOverelement !== targetEle &&
                  ((mouseEvent.target = targetEle),
                  self.mouseOverelement.mouseoutHandler(mouseEvent)),
                (self.mouseOverelement = targetEle),
                false == targetEle.isMouseOver
                  ? ((mouseEvent.target = targetEle),
                    targetEle.mouseoverHandler(mouseEvent),
                    self.dispatchEvent('mouseover', mouseEvent))
                  : ((mouseEvent.target = targetEle),
                    targetEle.mousemoveHandler(mouseEvent),
                    self.dispatchEvent('mousemove', mouseEvent)))
              : self.mouseOverelement
              ? ((mouseEvent.target = targetEle),
                self.mouseOverelement.mouseoutHandler(mouseEvent),
                (self.mouseOverelement = null),
                self.dispatchEvent('mouseout', mouseEvent))
              : ((mouseEvent.target = null),
                self.dispatchEvent('mousemove', mouseEvent));
          }),
          (this.mouseoverHandler = function (a) {
            var b = this.toSceneEvent(a);
            this.dispatchEvent('mouseover', b);
          }),
          (this.mouseoutHandler = function (a) {
            var b = this.toSceneEvent(a);
            this.dispatchEvent('mouseout', b);
          }),
          (this.clickHandler = function (a) {
            var b = this.toSceneEvent(a);
            this.currentElement &&
              ((b.target = this.currentElement),
              this.currentElement.clickHandler(b)),
              this.dispatchEvent('click', b);
          }),
          (this.dbclickHandler = function (a) {
            var b = this.toSceneEvent(a);
            this.currentElement
              ? ((b.target = this.currentElement),
                this.currentElement.dbclickHandler(b))
              : this.cancleAllSelected(),
              this.dispatchEvent('dbclick', b);
          }),
          (this.addEventListener = function (a, b) {
            var c = this,
              d = function (a) {
                b.call(c, a);
              };
            return this.messageBus.subscribe(a, d), this;
          }),
          (this.removeEventListener = function (event) {
            this.messageBus.unsubscribe(event);
          }),
          (this.removeAllEventListener = function () {
            this.messageBus = new DGraph.util.MessageBus();
          }),
          (this.dispatchEvent = function (a, b) {
            return this.messageBus.publish(a, b), this;
          });
        var eventNames =
            'click,dbclick,mousedown,mouseup,mouseover,mouseout,mousemove,mousedrag'.split(
              ','
            ),
          self = this;
        return (
          eventNames.forEach(function (eventName) {
            self[eventName] = function (event) {
              null != event
                ? this.addEventListener(eventName, event)
                : this.dispatchEvent(eventName);
            };
          }),
          (this.zoom = function (scaleX, scaleY) {
            null != scaleX && 0 != scaleX && (this.scaleX = scaleX),
              null != scaleY && 0 != scaleY && (this.scaleY = scaleY);
          }),
          (this.zoomOut = function (scale) {
            0 != scale &&
              (null == scale && (scale = 0.8),
              (this.scaleX /= scale),
              (this.scaleY /= scale));
          }),
          (this.zoomIn = function (scale) {
            0 != scale &&
              (null == scale && (scale = 0.8),
              (this.scaleX *= scale),
              (this.scaleY *= scale));
          }),
          (this.getBound = function () {
            return {
              left: 0,
              top: 0,
              right: this.stage.canvas.width,
              bottom: this.stage.canvas.height,
              width: this.stage.canvas.width,
              height: this.stage.canvas.height,
            };
          }),
          (this.getElementsBound = function () {
            if (this.childs.length == 0) {
              return null;
            }
            return this.getBoundWithElemets(this.childs);
          }),
          (this.getBoundWithElemets = function (elements) {
            var bound = {
              left: Number.MAX_VALUE,
              right: -Number.MAX_VALUE,
              top: Number.MAX_VALUE,
              bottom: -Number.MAX_VALUE,
            };
            elements
              .filter(function (it) {
                return it.visible && it instanceof DGraph.Node;
              })
              .forEach(function (node) {
                if (bound.left > node.x) {
                  bound.left = node.x;
                  bound.leftNode = node;
                }
                if (bound.right < node.x + node.width) {
                  bound.right = node.x + node.width;
                  bound.rightNode = node;
                }
                if (bound.top > node.y) {
                  bound.top = node.y;
                  bound.topNode = node;
                }
                if (bound.bottom < node.y + node.height) {
                  bound.bottom = node.y + node.height;
                  bound.bottomNode = node;
                }
              });
            if (bound.leftNode.parentContainer) {
              bound.left = bound.left - bound.leftNode.parentContainer.padding;
            }
            if (bound.rightNode.parentContainer) {
              bound.right =
                bound.right + bound.rightNode.parentContainer.padding;
            }
            if (bound.bottomNode.parentContainer) {
              bound.bottom =
                bound.bottom + bound.bottomNode.parentContainer.padding;
            }
            if (bound.topNode.parentContainer) {
              bound.top =
                bound.top -
                bound.topNode.parentContainer.padding -
                bound.topNode.parentContainer.headerHeight;
            }
            bound.width = bound.right - bound.left;
            bound.height = bound.bottom - bound.top;
            return bound;
          }),
          (this.translateToCenter = function (stage) {
            var bound = this.getElementsBound();
            if (bound != null) {
              var translateX = 0,
                translateY = 0;
              if (stage) {
                translateX =
                  stage.canvas.width / 2 - (bound.left + bound.right) / 2;
                translateY =
                  stage.canvas.height / 2 - (bound.top + bound.bottom) / 2;
              } else {
                (translateX =
                  this.stage.canvas.width / 2 - (bound.left + bound.right) / 2),
                  (translateY =
                    this.stage.canvas.height / 2 -
                    (bound.top + bound.bottom) / 2);
              }
              this.translateX = translateX;
              this.translateY = translateY;
            }
          }),
          (this.setCenter = function (x, y) {
            var offsetX = x - this.stage.canvas.width / 2;
            var offsetY = y - this.stage.canvas.height / 2;
            this.translateX = -offsetX;
            this.translateY = -offsetY;
          }),
          (this.centerAndZoom = function (scaleX, scaleY, stage) {
            this.translateToCenter(stage);
            if (null == scaleX || null == scaleY) {
              var bound = this.getElementsBound();
              if (bound != null) {
                var width = bound.right - bound.left;
                var height = bound.bottom - bound.top;
                var scaleX = 1,
                  scaleY = 1;
                if (stage) {
                  scaleX = stage.canvas.width / width;
                  scaleY = stage.canvas.height / height;
                } else {
                  scaleX = this.stage.canvas.width / width;
                  scaleY = this.stage.canvas.height / height;
                }
                var scale = Math.min(scaleX, scaleY);
                if (scale <= 1) {
                  this.zoom(scale, scale);
                }
              }
            } else {
              this.zoom(scaleX, scaleY);
            }
          }),
          (this.getCenterLocation = function () {
            var self = this;
            return {
              x: self.stage.canvas.width / 2,
              y: self.stage.canvas.height / 2,
            };
          }),
          self
        );
      }
      Scene.prototype = new DGraph.Element();
      DGraph.Scene = Scene;
    })(DGraph),
    (function (DGraph) {
      function DisplayElement() {
        (this.initialize = function () {
          DisplayElement.prototype.initialize.apply(this, arguments),
            (this.elementType = 'displayElement'),
            (this.x = 0),
            (this.y = 0),
            (this.width = 40),
            (this.height = 40),
            (this.radius = 20);
          (this.visible = true),
            (this.alpha = 1),
            (this.rotate = 0),
            (this.scaleX = 1),
            (this.scaleY = 1),
            (this.strokeColor = '22,255,22'),
            (this.borderColor = '22,255,22'),
            (this.fillColor = '22,255,22'),
            (this.shadow = false),
            (this.shadowBlur = 20),
            (this.shadowColor = 'rgba(20,200,20,0.5)'),
            (this.shadowOffsetX = 3),
            (this.shadowOffsetY = 6),
            (this.transformAble = false),
            (this.animate = false),
            (this.zIndex = 0);
        }),
          this.initialize(),
          (this.paint = function (ctx) {
            ctx.beginPath(),
              ctx.rect(
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
              ),
              (ctx.fillStyle = `rgba(${this.fillColor},${this.alpha})`),
              ctx.fill(),
              (ctx.strokeStyle = `rgba(${this.strokeColor},${this.alpha})`),
              ctx.stroke(),
              ctx.closePath();
          }),
          (this.getLocation = function () {
            return { x: this.x, y: this.y };
          }),
          (this.setLocation = function (x, y) {
            this.x = x;
            this.y = y;
            return this;
          }),
          (this.getCenterLocation = function () {
            return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
          }),
          (this.setCenterLocation = function (x, y) {
            this.x = x - this.width / 2;
            this.y = y - this.height / 2;
            return this;
          }),
          (this.getSize = function () {
            return { width: this.width, height: this.heith };
          }),
          (this.setSize = function (width, height) {
            this.width = Number(width) || 40;
            this.height = Number(height) || 40;
            this.raduis = Math.round(this.width / 2);
            return this;
          }),
          (this.getBound = function () {
            return {
              left: this.x - this.borderWidth,
              top: this.y - this.borderWidth,
              right: this.x + this.width + this.borderWidth,
              bottom: this.y + this.height + this.borderWidth,
              width: this.width,
              height: this.height,
            };
          }),
          (this.setBound = function (x, y, width, height) {
            this.setLocation(x, y);
            this.setSize(width, height);
            return this;
          }),
          (this.getPosition = function (textPosition) {
            var pos,
              bound = this.getBound();
            switch (textPosition) {
              case 'Top_Left':
                pos = { x: bound.left, y: bound.top };
                break;
              case 'Top_Center':
                pos = { x: this.cx, y: bound.top };
                break;
              case 'Top_Right':
                pos = { x: bound.right, y: bound.top };
                break;
              case 'Middle_Left':
                pos = { x: bound.left, y: this.cy };
                break;
              case 'Middle_Center':
                pos = { x: this.cx, y: this.cy };
                break;
              case 'Middle_Right':
                pos = { x: bound.right, y: this.cy };
                break;
              case 'Bottom_Left':
                pos = { x: bound.left, y: bound.bottom };
                break;
              case 'Bottom_Center':
                pos = { x: this.cx, y: bound.bottom };
                break;
              case 'Bottom_Right':
                pos = { x: bound.right, y: bound.bottom };
                break;
              default:
                pos = { x: this.cx, y: this.cy };
                break;
            }
            return pos;
          });
      }
      function InteractiveElement() {
        (this.initialize = function () {
          InteractiveElement.prototype.initialize.apply(this, arguments),
            (this.elementType = 'interactiveElement'),
            (this.dragable = false),
            (this.selected = false),
            (this.showSelected = false),
            (this.isMouseOver = false),
            (this.selectedLocation = null),
            (this.showBackGround = false),
            (this.animate = false);
        }),
          this.initialize(),
          (this.paintMouseover = function (ctx) {
            this.showSelected = true;
          }),
          (this.isInBound = function (x, y) {
            if (this.shape == 'rect') {
              var width = this.width * this.scaleX;
              var height = this.height * this.scaleY;
              if (this.rotate == 0) {
                return (
                  x > this.cx - width / 2 &&
                  x < this.cx + width / 2 &&
                  y > this.cy - height / 2 &&
                  y < this.cy + height / 2
                );
              } else {
                var cpx = this.cx,
                  cpy = this.cy;
                var angle = -((this.rotate * Math.PI) / 180);
                var x0 =
                  (x - cpx) * Math.cos(angle) -
                  (y - cpy) * Math.sin(angle) +
                  cpx;
                var y0 =
                  (x - cpx) * Math.sin(angle) +
                  (y - cpy) * Math.cos(angle) +
                  cpy;
                return (
                  x0 > this.cx - width / 2 &&
                  x0 < this.cx + width / 2 &&
                  y0 > this.cy - height / 2 &&
                  y0 < this.cy + height / 2
                );
              }
            } else {
              return (
                (x - this.cx) * (x - this.cx) + (y - this.cy) * (y - this.cy) <
                this.radius * this.scaleX * this.radius * this.scaleX
              );
            }
          }),
          (this.selectedHandler = function () {
            (this.selected = true),
              (this.selectedLocation = { x: this.x, y: this.y });
          }),
          (this.unselectedHandler = function () {
            (this.selected = false), (this.selectedLocation = null);
          }),
          (this.dbclickHandler = function (event) {
            this.dispatchEvent('dbclick', event);
          }),
          (this.clickHandler = function (event) {
            this.dispatchEvent('click', event);
          }),
          (this.mousedownHander = function (a) {
            this.dispatchEvent('mousedown', a);
          }),
          (this.mouseupHandler = function (event) {
            this.dispatchEvent('mouseup', event);
          }),
          (this.mouseoverHandler = function (event) {
            (this.isMouseOver = true), this.dispatchEvent('mouseover', event);
          }),
          (this.mousemoveHandler = function (event) {
            this.dispatchEvent('mousemove', event);
          }),
          (this.mouseoutHandler = function (event) {
            (this.isMouseOver = false),
              (this.showSelected = false),
              this.dispatchEvent('mouseout', event);
          }),
          (this.mousedragHandler = function (event) {
            var x = this.selectedLocation.x + event.dx,
              y = this.selectedLocation.y + event.dy;
            this.setLocation(x, y), this.dispatchEvent('mousedrag', event);
          }),
          (this.addEventListener = function (eventName, fucn) {
            var self = this,
              event = function (e) {
                fucn.call(self, e);
              };
            return (
              this.messageBus ||
                (this.messageBus = new DGraph.util.MessageBus()),
              this.messageBus.subscribe(eventName, event),
              this
            );
          }),
          (this.dispatchEvent = function (eventName, fucn) {
            return this.messageBus
              ? (this.messageBus.publish(eventName, fucn), this)
              : null;
          }),
          (this.removeEventListener = function (event) {
            this.messageBus.unsubscribe(event);
          }),
          (this.removeAllEventListener = function () {
            this.messageBus = new DGraph.util.MessageBus();
          });
        var self = this;
        var eventNames = [
          'click',
          'dbclick',
          'mousedown',
          'mouseup',
          'mouseover',
          'mouseout',
          'mousemove',
          'mousedrag',
        ];
        eventNames.forEach(function (eventName) {
          self[eventName] = function (event) {
            null != event
              ? this.addEventListener(eventName, event)
              : this.dispatchEvent(eventName);
          };
        });
      }
      (DisplayElement.prototype = new DGraph.Element()),
        Object.defineProperties(DisplayElement.prototype, {
          cx: {
            get: function () {
              return this.x + this.width / 2;
            },
            set: function (x) {
              this.x = x - this.width / 2;
            },
          },
          cy: {
            get: function () {
              return this.y + this.height / 2;
            },
            set: function (y) {
              this.y = y - this.height / 2;
            },
          },
          radius: {
            get: function () {
              return Math.round(this.width / 2);
            },
            set: function (r) {
              this.width = r * 2;
            },
          },
        }),
        (InteractiveElement.prototype = new DisplayElement()),
        (DGraph.DisplayElement = DisplayElement),
        (DGraph.InteractiveElement = InteractiveElement);
    })(DGraph),
    (function (DGraph) {
      function Node(name) {
        (this.initialize = function (name) {
          Node.prototype.initialize.apply(this, arguments),
            (this.elementType = 'node'),
            (this.zIndex = DGraph.Node_zIndex),
            (this.text = name),
            (this.font = 'normal 13px Arial'),
            (this.fontColor = '20,20,20'),
            (this.borderWidth = 0),
            (this.borderColor = '20,255,20'),
            (this.borderAlpha = 1),
            (this.selectedBorderColor = '255,0,0'),
            (this.selectedBorderWidth = 10),
            (this.selectedBorderAlpha = 0.7),
            (this.borderRadius = 0),
            (this.shadowColor = '20,255,20'),
            (this.shadowBlur = 10),
            (this.dragable = true),
            (this.textPosition = 'Middle_Center'),
            (this.textOffsetX = 0),
            (this.textOffsetY = 0),
            (this.transformAble = true),
            (this.inLinks = null),
            (this.outLinks = null);
          this.width = 60;
          this.height = 60;
          (this.labelBackGround = null),
            (this.labelBorderWidth = 0),
            (this.labelBorderColor = '255,255,255');
          this.fillStyle = null;
          this.textLines = [];
          this.maxLineWidth = 0;
          this.fontWith = 18;
          this.icon = {
            font: 'bold 20px Consolas',
            text: null,
            color: '255,255,255',
            left: -this.width,
            top: this.height / 2,
          };
        }),
          this.initialize(name),
          (this.drawNodeImg = function (ctx, img, x, y, r) {
            if (this.shape == 'rect') {
              ctx.drawImage(img, x, y, this.width, this.height);
            } else {
              ctx.arc(x + r, y + r, r, 0, 2 * Math.PI);
              ctx.clip();
              ctx.drawImage(img, x, y, 2 * r, 2 * r);
            }
          }),
          (this.paint = function (ctx, onlyShape) {
            if (this.drawNode && typeof this.drawNode === 'function') {
              if (this.showBackGround) {
                ctx.save(), ctx.beginPath();
                ctx.rect(
                  -this.width / 2 - 5,
                  -this.height / 2 - 5,
                  this.width + 10,
                  this.height + 10
                );
                ctx.closePath();
                ctx.fillStyle = 'rgba(220,220,220,0.5)';
                ctx.fill();
                ctx.restore();
              }
              this.drawNode(ctx);
              return false;
            }
            this.drawShape(ctx, onlyShape);
            if (this.image && !onlyShape) {
              var b = ctx.globalAlpha;
              ctx.save();
              ctx.globalAlpha = this.alpha;
              this.drawNodeImg(
                ctx,
                this.image,
                -this.width / 2,
                -this.height / 2,
                this.width / 2
              );
              ctx.globalAlpha = b;
              ctx.restore();
            }
            if (!onlyShape) {
              if (this.icon && this.icon.text) {
                this.paintIcon(ctx);
              }
              this.paintText(ctx), this.paintTipText(ctx);
              this.paintHeadTip(ctx);
            }
          }),
          (this.drawShape = function (ctx, onlyShape) {
            ctx.save();
            ctx.beginPath();
            this.paintShape(ctx);
            ctx.closePath();
            if (!onlyShape) {
              if (this.lineDash && this.lineDash.length > 1) {
                ctx.setLineDash(this.lineDash);
              }
              if (
                (this.showSelected || this.selected) &&
                this.selectedBorderWidth > 0
              ) {
                ctx.lineWidth = this.borderWidth + this.selectedBorderWidth;
                ctx.strokeStyle = `rgba(${this.selectedBorderColor},${
                  this.alpha * this.selectedBorderAlpha
                })`;
                ctx.stroke();
              }
              if (
                !this.selected &&
                !this.showSelected &&
                this.borderWidth > 0
              ) {
                ctx.lineWidth = this.borderWidth;
                ctx.strokeStyle = this.strokeStyle
                  ? this.strokeStyle
                  : `rgba(${this.borderColor},${
                      this.alpha * this.borderAlpha
                    })`;
                ctx.stroke();
              }
              if (this.fillColor || onlyShape) {
                this.paintShadow(ctx);
                ctx.fillStyle = this.fillStyle
                  ? this.fillStyle
                  : `rgba(${this.fillColor},${this.alpha})`;
                ctx.fill();
              }
            } else {
              ctx.fillStyle = this.fillStyle
                ? this.fillStyle
                : `rgba(${this.fillColor},${this.alpha})`;
              ctx.fill();
            }
            ctx.restore();
          }),
          (this.paintShape = function (ctx) {
            switch (this.shape) {
              case 'rect':
                if (!this.borderRadius) {
                  ctx.rect(
                    -this.width / 2,
                    -this.height / 2,
                    this.width,
                    this.height
                  );
                } else {
                  var width = this.width;
                  var height = this.height;
                  var r2d = Math.PI / 180;
                  var r = this.borderRadius;
                  var x = -width / 2,
                    y = -height / 2;
                  if (width - 2 * r < 0) {
                    r = width / 2;
                  }
                  if (height - 2 * r < 0) {
                    r = height / 2;
                  }
                  ctx.moveTo(x + r, y);
                  ctx.lineTo(x + width - r, y);
                  ctx.arc(x + width - r, y + r, r, r2d * 270, r2d * 360, false);
                  ctx.lineTo(x + width, y + height - r);
                  ctx.arc(x + width - r, y + height - r, r, 0, r2d * 90, false);
                  ctx.lineTo(x + r, y + height);
                  ctx.arc(x + r, y + height - r, r, r2d * 90, r2d * 180, false);
                  ctx.lineTo(x, y + r);
                  ctx.arc(x + r, y + r, r, r2d * 180, r2d * 270, false);
                }
                break;
              case 'ellipse':
                ctx.ellipse(
                  0,
                  0,
                  this.radius,
                  this.radius / 2,
                  0,
                  0,
                  2 * Math.PI
                );
                break;
              case 'triangle':
                ctx.moveTo(0, -this.radius);
                ctx.lineTo(-this.radius, this.radius);
                ctx.lineTo(this.radius, this.radius);
                break;
              case 'star':
                var r = this.radius * 2 * 0.41;
                for (var n = 0; n < 10; n++) {
                  var radius = n % 2 === 0 ? r * 1.3 : r * 0.5;
                  ctx.lineTo(
                    radius * Math.sin((n * 2 * Math.PI) / 10),
                    0.1 * r - radius * Math.cos((n * 2 * Math.PI) / 10)
                  );
                }
                break;
              case 'polygon':
                var degree = (2 * Math.PI) / 6;
                for (var i = 0; i < 6; i++) {
                  var x = Math.cos(i * degree);
                  var y = Math.sin(i * degree);
                  ctx.lineTo(x * this.radius, y * this.radius);
                }
                break;
              case 'circle':
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2, false);
                break;
              default:
                ctx.arc(0, 0, this.radius, 0, 2 * Math.PI, true);
                break;
            }
          }),
          (this.paintTipText = function (ctx) {
            if (this.tipText) {
              var b = this.alarmColor || '0,250,0',
                c = this.alarmAlpha || 0.8 * this.alpha;
              ctx.font = this.alarmFont || '10px Consolas';
              var d = ctx.measureText(this.tipText).width + 6,
                e = ctx.measureText('田').width + 6,
                f = this.width / 2 - d / 2,
                g = -this.height / 2 - e - 8;
              (ctx.strokeStyle = `rgba(${b},${c})`),
                (ctx.fillStyle = `rgba(${b},${c})`),
                ctx.DGraphRoundRect(
                  this.width / 3,
                  -this.height / 2,
                  d + 5,
                  e,
                  8
                ),
                ctx.stroke(),
                ctx.fill(),
                (ctx.fillStyle = `rgba(250,250,250,${this.alpha})`),
                ctx.fillText(
                  this.tipText,
                  this.width / 3 + 5,
                  -this.height / 2 + 12
                );
            }
          }),
          (this.paintText = function (ctx) {
            var self = this;
            var label;
            if (this.showlabel && this.showlabel == true) {
              label = this.text = this.label;
            } else {
              label = this.text = null;
              return;
            }
            if (label) {
              var pos;
              ctx.save();
              ctx.font = this.font;
              ctx.fillStyle = `rgba(${this.fontColor},${this.alpha})`;
              this.processLabel(ctx);
              var singleTextWidth = ctx.measureText('田').width;
              if (this.wrapText == true) {
                var textArr = this.buildTextArray(label);
                var maxWidth = 0;
                textArr.forEach(function (text, i) {
                  text = String(text);
                  var textWidth = ctx.measureText(
                    text.replace(/ /g, '田')
                  ).width;
                  maxWidth = Math.max(maxWidth, textWidth);
                  pos = self.getTextPostion(
                    self.textPosition,
                    textWidth,
                    singleTextWidth
                  );
                  ctx.fillText(
                    text,
                    pos.x,
                    -((singleTextWidth / 2) * textArr.length) +
                      (i + 1) * singleTextWidth
                  );
                });
                this.width =
                  maxWidth + 8 < this.width ? this.width : maxWidth + 8;
              } else {
                var lineCount = this.textLines.length;
                var labelHeight = lineCount * singleTextWidth;
                if (this.labelBackGround) {
                  pos = this.getTextPostion(
                    this.textPosition,
                    this.maxLineWidth,
                    singleTextWidth
                  );
                  ctx.save();
                  ctx.lineWidth = 1;
                  ctx.strokeStyle = `rgba(${this.labelBorderColor},${this.alpha})`;
                  ctx.fillStyle = `rgba(${this.labelBackGround},${this.alpha})`;
                  ctx.DGraphRoundRect(
                    pos.x - 5,
                    pos.y - singleTextWidth * 1.45,
                    this.maxLineWidth + 10,
                    labelHeight + singleTextWidth + (lineCount == 1 ? 0 : 4),
                    5
                  );
                  ctx.stroke(), ctx.fill(), ctx.restore();
                }
                if (this.labelBorderWidth > 0) {
                  ctx.lineWidth = this.labelBorderWidth;
                  ctx.strokeStyle = `rgba(${this.labelBorderColor},${this.alpha})`;
                  ctx.lineJoin = 'round';
                  ctx.lineCap = 'round';
                }
                if (lineCount == 1) {
                  var textWidth = ctx.measureText(this.textLines[0]).width;
                  pos = this.getTextPostion(
                    this.textPosition,
                    textWidth,
                    singleTextWidth
                  );
                  this.labelBorderWidth > 0
                    ? ctx.strokeText(this.textLines[0], pos.x, pos.y)
                    : null;
                  ctx.fillText(this.textLines[0], pos.x, pos.y - 1);
                } else {
                  for (let i = 0; i < lineCount; i++) {
                    var textWidth = ctx.measureText(this.textLines[i]).width;
                    pos = this.getTextPostion(
                      this.textPosition,
                      textWidth,
                      singleTextWidth
                    );
                    this.labelBorderWidth > 0
                      ? ctx.strokeText(
                          this.textLines[i],
                          pos.x,
                          pos.y + i * singleTextWidth + (i == 0 ? 0 : 2 * i)
                        )
                      : null;
                    ctx.fillText(
                      this.textLines[i],
                      pos.x,
                      pos.y - 1 + i * singleTextWidth + (i == 0 ? 0 : 2 * i)
                    );
                  }
                }
              }
              ctx.restore();
            }
          }),
          (this.processLabel = function (ctx) {
            let lines = [];
            if (this.label) {
              lines = String(this.label).split('\n');
              for (let i = 0; i < lines.length; i++) {
                this.maxLineWidth = Math.max(
                  ctx.measureText(lines[i]).width,
                  this.maxLineWidth
                );
              }
            }
            this.textLines = lines;
          }),
          (this.buildTextArray = function (label) {
            var length = String(label).length;
            var textArr = [];
            if (length < 5) {
              textArr.push(label);
            } else if (length >= 5 && length <= 9) {
              textArr.push(label.substring(0, 4));
              textArr.push(label.substring(4));
            } else if (length > 9 && length <= 13) {
              textArr.push(label.substring(0, 4));
              textArr.push(label.substring(4, 9));
              textArr.push(label.substring(9));
            } else {
              textArr.push(label.substring(0, 4));
              textArr.push(label.substring(4, 9));
              textArr.push(label.substring(9, 12) + '..');
            }
            return textArr;
          });
        (this.paintShadow = function (ctx) {
          if (this.showShadow && this.selected) {
            (ctx.shadowBlur = this.shadowBlur),
              (ctx.shadowColor = `rgba(${this.shadowColor},${
                this.alpha * 0.9
              })`),
              (ctx.shadowOffsetX = 0),
              (ctx.shadowOffsetY = 0);
          }
        }),
          (this.paintIcon = function (ctx) {
            ctx.save(),
              (ctx.fillStyle = `rgba(${this.icon.color},${this.alpha})`);
            (ctx.font = this.icon.font),
              ctx.fillText(
                this.icon.text,
                this.icon.left || 5,
                this.icon.top || 5
              ),
              ctx.restore();
          }),
          (this.paintHeadTip = function (ctx) {
            if (this.headTipText) {
              var radius = this.headTipRadius || 0;
              var padding = 16;
              ctx.save();
              ctx.font = this.headTipFont || 'normal 13px Arial';
              var width = ctx.measureText(this.headTipText).width + padding;
              var height = ctx.measureText('田').width + padding - 2;
              radius = radius > height / 2 ? height / 2 : radius;
              ctx.translate(-width / 2, -height - this.height / 2 - 6);
              ctx.beginPath();
              ctx.arc(width - radius, height - radius, radius, 0, Math.PI / 2);
              ctx.lineTo(width / 2.0 + 4, height);
              ctx.lineTo(width / 2.0, height + 6);
              ctx.lineTo(width / 2.0 - 4, height);
              ctx.lineTo(radius, height);
              ctx.arc(radius, height - radius, radius, Math.PI / 2, Math.PI);
              ctx.lineTo(0, radius);
              ctx.arc(radius, radius, radius, Math.PI, (Math.PI * 3) / 2);
              ctx.lineTo(width - radius, 0);
              ctx.arc(
                width - radius,
                radius,
                radius,
                (Math.PI * 3) / 2,
                Math.PI * 2
              );
              ctx.lineTo(width, height - radius);
              ctx.closePath();
              ctx.fillStyle = `rgba(${this.headTipColor || '250,50,50'},${
                this.alpha
              })`;
              ctx.fill();
              ctx.translate(width / 2, height / 2);
              ctx.textBaseline = 'middle';
              ctx.textAlign = 'center';
              ctx.fillStyle = `rgba(${this.headTipFontColor || '250,250,250'},${
                this.alpha
              })`;
              ctx.fillText(this.headTipText, 0, 0);
              ctx.restore();
            }
          }),
          (this.getTextPostion = function (
            textPosition,
            textWidth,
            textHeight
          ) {
            var position = null;
            return (
              null == textPosition || 'Bottom_Center' == textPosition
                ? (position = {
                    x: -this.width / 2 + (this.width - textWidth) / 2,
                    y: this.height / 2 + textHeight,
                  })
                : 'Top_Center' == textPosition
                ? (position = {
                    x: -this.width / 2 + (this.width - textWidth) / 2,
                    y: -this.height / 2 - textHeight / 2,
                  })
                : 'Top_Right' == textPosition
                ? (position = {
                    x: this.width / 2,
                    y: -this.height / 2 - textHeight / 2,
                  })
                : 'Top_Left' == textPosition
                ? (position = {
                    x: -this.width / 2 - textWidth,
                    y: -this.height / 2 - textHeight / 2,
                  })
                : 'Bottom_Right' == textPosition
                ? (position = {
                    x: this.width / 2,
                    y: this.height / 2 + textHeight,
                  })
                : 'Bottom_Left' == textPosition
                ? (position = {
                    x: -this.width / 2 - textWidth,
                    y: this.height / 2 + textHeight,
                  })
                : 'Middle_Center' == textPosition
                ? (position = {
                    x: -this.width / 2 + (this.width - textWidth) / 2,
                    y: textHeight / 2,
                  })
                : 'Middle_Right' == textPosition
                ? (position = { x: this.width / 2, y: textHeight / 2 })
                : 'Middle_Left' == textPosition &&
                  (position = {
                    x: -this.width / 2 - textWidth,
                    y: textHeight / 2,
                  }),
              null == position
                ? (position = {
                    x: -this.width / 2 + (this.width - textWidth) / 2,
                    y: this.height / 2 + textHeight,
                  })
                : position,
              null != this.textOffsetX && (position.x += this.textOffsetX),
              null != this.textOffsetY && (position.y += this.textOffsetY),
              position
            );
          }),
          (this.setImage = function (imgS, c) {
            if (null == imgS) throw new Error('image is null!');
            var self = this;
            if ('string' == typeof imgS) {
              var img = {}[imgS];
              if (img == null) {
                img = new Image();
                img.setAttribute('crossOrigin', 'Anonymous');
                img.src = imgS;
                img.onload = function () {
                  self.image = img;
                };
              } else {
                this.setSize(img.width, img.height), (this.image = img);
              }
            } else {
              (this.image = imgS), this.setSize(imgS.width, imgS.height);
            }
          }),
          (this.removeHandler = function (a) {
            var self = this;
            this.outLinks &&
              (this.outLinks.forEach(function (link) {
                link.source === self && a.remove(link);
              }),
              (this.outLinks = null));
            this.inLinks &&
              (this.inLinks.forEach(function (link) {
                link.target === self && a.remove(link);
              }),
              (this.inLinks = null));
          });
      }
      (Node.prototype = new DGraph.InteractiveElement()), (DGraph.Node = Node);
    })(DGraph),
    (function (DGraph) {
      function mergeLine(source, target) {
        var lines = [];
        if (null == source || null == target) return lines;
        if (source.outLinks && target.inLinks)
          for (var i = 0; i < source.outLinks.length; i++)
            for (
              var outLink = source.outLinks[i], j = 0;
              j < target.inLinks.length;
              j++
            ) {
              var inLink = target.inLinks[j];
              outLink === inLink && lines.push(inLink);
            }
        return lines;
      }
      function findLines(source, target, twoDirect) {
        if (twoDirect != null && twoDirect == true) {
          var outLines = mergeLine(source, target),
            inLines = mergeLine(target, source),
            allLines = outLines.concat(inLines);
          return allLines;
        }
        return mergeLine(source, target);
      }
      function findAllLines(line) {
        var lines = findLines(line.source, line.target);
        return (lines = lines.filter(function (_line) {
          return line !== _line;
        }));
      }
      function calLineNum(source, target, twoDirect) {
        return findLines(source, target, twoDirect).length;
      }
      function Link(source, target, label) {
        (this.initialize = function (source, target, label) {
          Link.prototype.initialize.apply(this, arguments);
          this.elementType = 'link';
          this.zIndex = DGraph.Link_zIndex;
          (this.text = label),
            (this.source = source),
            (this.target = target),
            this.source &&
              null == this.source.outLinks &&
              (this.source.outLinks = []),
            this.source &&
              null == this.source.inLinks &&
              (this.source.inLinks = []),
            this.target &&
              null == this.target.inLinks &&
              (this.target.inLinks = []),
            this.target &&
              null == this.target.outLinks &&
              (this.target.outLinks = []),
            null != this.source && this.source.outLinks.push(this),
            null != this.target && this.target.inLinks.push(this),
            this.caculateIndex(),
            (this.font = 'normal 13px Arial'),
            (this.fontColor = '120,120,120'),
            (this.lineWidth = 2),
            (this.lineJoin = 'round'),
            (this.showShadow = false);
          (this.shadowColor = '10,250,10'),
            (this.selectedColor = '10,10,230'),
            (this.selectedAlpha = 1);
          this.background = null;
          (this.transformAble = false),
            (this.textOffsetX = 0),
            (this.textOffsetY = 0),
            (this.bundleOffset = 20),
            (this.bundleGap = 30),
            (this.groupNum = 1),
            (this.curveness = 0.5),
            (this.arrowsRadius = 5),
            (this.showlabel = true),
            (this.showArrow = true),
            (this.arrowType = 'arrow'),
            (this.labelBackGround = null),
            (this.labelBorderWidth = 0),
            (this.labelBorderColor = '255,255,255');
          this.path = [];
          this.animate = false;
          this.animateSpeed = 5;
          this.animateBallIndex = 1;
          this.animateBall = null;
          this.animateBallColor = '255,0,0';
          this.animateBallSize = Math.round(this.lineWidth * 2);
          this.lineDashOffset = 0;
        }),
          (this.findInsertPoint = function (target, source) {
            var line = DGraph.util.lineVir(
                target.cx,
                target.cy,
                source.cx,
                source.cy
              ),
              bound = target.getBound(),
              point = DGraph.util.intersectionLineBound(line, bound);
            return point;
          }),
          (this.caculateIndex = function () {
            var index = calLineNum(this.source, this.target, false);
            if (index > 0) {
              this.nodeIndex = index - 1;
            }
          }),
          this.initialize(source, target, label),
          (this.removeHandler = function () {
            var self = this;
            this.source &&
              this.source.outLinks &&
              (this.source.outLinks = this.source.outLinks.filter(function (b) {
                return b !== self;
              })),
              this.target &&
                this.target.inLinks &&
                (this.target.inLinks = this.target.inLinks.filter(function (b) {
                  return b !== self;
                }));
            var lines = findAllLines(this);
            lines.forEach(function (line, i) {
              line.nodeIndex = i;
            });
          }),
          (this.getStartPosition = function () {
            var cpoint = { x: this.source.cx, y: this.source.cy };
            return cpoint;
          }),
          (this.getEndPosition = function () {
            var epoint = { x: this.target.cx, y: this.target.cy };
            return (
              (epoint = this.findInsertPoint(this.target, this.source)),
              null == epoint &&
                (epoint = { x: this.target.cx, y: this.target.cy }),
              epoint
            );
          }),
          (this.getPath = function () {
            var startPoint = this.getStartPosition(),
              endPoint = this.getEndPosition();
            return [startPoint, endPoint];
          }),
          (this.paintLine = function (ctx, label) {}),
          (this.paintArrow = function (ctx, g, h) {}),
          (this.paint = function (ctx) {}),
          (this.paintText = function (ctx, label) {}),
          (this.isInBound = function (mouseX, mouseY) {
            var self = this;
            if (this.path.length > 0) {
              var lineWidth = self.lineWidth;
              if (self.labelBackHeight) {
                lineWidth = Math.round(self.labelBackHeight / 2);
              }
              var flag = false;
              for (var i = 1; i < this.path.length; i++) {
                var startPoint = this.path[i - 1],
                  endPoint = this.path[i];
                if (
                  true ==
                  DGraph.util.containStroke(
                    startPoint.x,
                    startPoint.y,
                    endPoint.x,
                    endPoint.y,
                    lineWidth,
                    mouseX,
                    mouseY
                  )
                ) {
                  flag = true;
                  break;
                }
              }
              return flag;
            } else {
              if (self.bezierPoints) {
                var pos = self.bezierPoints;
                return DGraph.util.containBerzierStroke(
                  pos[0],
                  pos[1],
                  pos[2],
                  pos[3],
                  pos[4],
                  pos[5],
                  pos[6],
                  pos[7],
                  self.lineWidth,
                  mouseX,
                  mouseY
                );
              }
              if (self.quadraticPoints) {
                var pos = self.quadraticPoints;
                return DGraph.util.containQuadraticStroke(
                  pos[0],
                  pos[1],
                  pos[2],
                  pos[3],
                  pos[4],
                  pos[5],
                  self.lineWidth,
                  mouseX,
                  mouseY
                );
              }
            }
            return false;
          });
      }
      function Edge(source, target, label) {
        (this.initialize = function () {
          Edge.prototype.initialize.apply(this, arguments);
        }),
          this.initialize(source, target, label),
          (this.paint = function (ctx, needHideText) {
            if (this.drawLine && typeof this.drawLine === 'function') {
              this.drawLine(ctx);
              return false;
            }
            if (null != this.source && null != !this.target) {
              if (this.colorType == 'source') {
                this.strokeColor = this.source.fillColor;
              } else if (
                this.colorType == 'target' ||
                this.colorType == 'both'
              ) {
                this.strokeColor = this.target.fillColor;
              }
              this.groupNum = calLineNum(this.target, this.source, true);
              if (this.source === this.target || this.groupNum > 1) {
                if (this.source === this.target) {
                  this.lineType = 'curver';
                } else {
                  this.paintMutilPath(ctx, !needHideText);
                  return;
                }
              }
              this.paintLine(ctx, label);
            }
          });
        (this.paintLine = function (ctx, label) {
          var lineType = this.lineType;
          switch (lineType) {
            case 'direct':
              this.paintDrirectLine(ctx, label);
              break;
            case 'curver':
              this.paintCurverLink(ctx, label);
              break;
            case 'vlink':
              this.paintVerticalLink(ctx, label);
              break;
            case 'hlink':
              this.paintHorizolLink(ctx, label);
              break;
            case 'bezier':
              this.paintBezier(ctx, label);
              break;
            case 'vbezier':
              this.paintVBezierLink(ctx, label);
              break;
            case 'hbezier':
              this.paintHBezierLink(ctx, label);
              break;
            case 'arrowline':
              this.paintArrowLine(ctx, label);
              break;
            case 'minderline':
              this.paintXMinderLine(ctx, label);
              break;
            case 'gephiline':
              this.paintGephiLine(ctx, label);
              break;
            default:
              this.lineType == 'direct';
              this.paintDrirectLine(ctx, label);
              break;
          }
        }),
          (this.paintAnimateBall = function (ctx) {
            var self = this;
            var path = self.path;
            if (path.length == 2) {
              self.animateBallIndex = 1;
            }
            if (
              self.animateBallIndex > 0 &&
              self.animateBallIndex < path.length
            ) {
              var sx = path[self.animateBallIndex - 1].x,
                sy = path[self.animateBallIndex - 1].y,
                tx = path[self.animateBallIndex].x,
                ty = path[self.animateBallIndex].y;
              var angle = Math.atan2(ty - sy, tx - sx);
              var animateBall = self.animateBall;
              if (
                animateBall == null ||
                animateBall.sx != sx ||
                animateBall.sy != sy ||
                animateBall.tx != tx ||
                animateBall.ty != ty
              ) {
                var dx = tx - sx,
                  dy = ty - sy;
                var diff = Math.sqrt(dx * dx + dy * dy);
                var moves = diff / self.animateSpeed;
                self.animateBall = {
                  x: sx,
                  y: sy,
                  sx: sx,
                  sy: sy,
                  tx: tx,
                  ty: ty,
                  angle: angle,
                  moves: moves,
                };
              }
            } else {
              self.animateBallIndex = 0;
              self.animateBall = null;
            }
            if (self.animateBall && self.animateBall.moves > 0) {
              self.animateBall.moves--;
              self.animateBall.x +=
                self.animateSpeed * Math.cos(self.animateBall.angle);
              self.animateBall.y +=
                self.animateSpeed * Math.sin(self.animateBall.angle);
              ctx.save();
              ctx.beginPath();
              ctx.fillStyle = `rgba(${self.animateBallColor},${self.alpha})`;
              ctx.arc(
                self.animateBall.x,
                self.animateBall.y,
                self.animateBallSize,
                0,
                2 * Math.PI
              );
              ctx.fill();
              ctx.closePath();
              ctx.restore();
              if (self.animateBall.moves <= 0) {
                self.animateBall = null;
                self.animateBallIndex++;
              }
            } else {
              self.animateBallIndex++;
            }
          }),
          (this.setLineStyle = function (ctx) {
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            if (this.selected || this.showSelected) {
              ctx.strokeStyle = `rgba(${this.selectedColor},${this.selectedAlpha})`;
            } else {
              if (this.colorType == 'both') {
                var grd = ctx.createLinearGradient(
                  this.source.cx,
                  this.source.cy,
                  this.target.cx,
                  this.target.cy
                );
                grd.addColorStop(
                  0,
                  `rgba(${this.source.fillColor},${self.alpha})`
                );
                grd.addColorStop(
                  1,
                  `rgba(${this.target.fillColor},${self.alpha})`
                );
                ctx.strokeStyle = grd;
              } else {
                ctx.strokeStyle = `rgba(${this.strokeColor},${this.alpha})`;
              }
            }
            ctx.lineWidth = this.lineWidth;
            if (this.lineDash && this.lineDash.length > 1) {
              ctx.setLineDash(this.lineDash);
              if (this.animate) {
                ctx.lineDashOffset = this.lineDashOffset -= 2;
                this.lineDashOffset =
                  this.lineDashOffset < -100 ? 1 : this.lineDashOffset;
              }
            }
          }),
          (this.paintMutilPath = function (ctx, showText) {
            var start = { x: this.source.cx, y: this.source.cy },
              end = { x: this.target.cx, y: this.target.cy };
            var controlPoints = this.computeControlPoint(start, end);
            var lineS = controlPoints.startPoint;
            var lineE = controlPoints.endPoint;
            var angle = Math.atan2(lineE.y - end.y, lineE.x - end.x);
            var insertPoint = end;
            var endPoint = end;
            if (this.showArrow) {
              if (this.target.shape == 'rect') {
                insertPoint = this.findInsertPoint(this.target, {
                  cx: lineE.x,
                  cy: lineE.y,
                });
              } else {
                var radius =
                  (this.target.radius + this.target.borderWidth / 2) *
                  this.target.scaleX;
                insertPoint = DGraph.util.pointOnCircle(
                  end.x,
                  end.y,
                  radius,
                  angle
                );
              }
              if (insertPoint == null) {
                insertPoint = end;
              }
              var arrowSize = this.getArrowRadius();
              (endPoint.x = insertPoint.x + arrowSize * Math.cos(angle)),
                (endPoint.y = insertPoint.y + arrowSize * Math.sin(angle));
            }
            this.path = [];
            this.path.push({ x: start.x, y: start.y }),
              this.path.push({ x: lineS.x, y: lineS.y }),
              this.path.push({ x: lineE.x, y: lineE.y }),
              this.path.push({ x: insertPoint.x, y: insertPoint.y });
            this.paintLineBackGround(ctx);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (var j = 1; j < this.path.length - 1; j++) {
              ctx.lineTo(this.path[j].x, this.path[j].y);
            }
            ctx.lineTo(endPoint.x, endPoint.y);
            this.setLineStyle(ctx), ctx.stroke(), ctx.closePath();
            ctx.restore();
            if (this.showArrow) {
              this.paintSpecialArrow(
                ctx,
                { x: lineE.x, y: lineE.y },
                insertPoint
              );
            }
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintAnimateBall(ctx);
            }
            if (this.showlabel && showText) {
              this.paintTextOnLineWithAngle(
                ctx,
                { cx: lineS.x, cy: lineS.y },
                { cx: lineE.x, cy: lineE.y }
              );
            }
          }),
          (this.computeControlPoint = function (start, end) {
            this.bundleOffset = DGraph.util.getDistance(start, end) * 0.45;
            var lineNum = this.groupNum;
            var angle = Math.atan2(end.y - start.y, end.x - start.x),
              gsPoint = {
                x: start.x + this.bundleOffset * Math.cos(angle),
                y: start.y + this.bundleOffset * Math.sin(angle),
              },
              gtPoint = {
                x: end.x + this.bundleOffset * Math.cos(angle - Math.PI),
                y: end.y + this.bundleOffset * Math.sin(angle - Math.PI),
              },
              bundleGap = (lineNum * this.bundleGap) / 2 - this.bundleGap / 2,
              offset = this.bundleGap * this.nodeIndex;
            angle -= Math.PI / 2;
            var lineS = {
                x:
                  gsPoint.x +
                  offset * Math.cos(angle) +
                  bundleGap * Math.cos(angle - Math.PI),
                y:
                  gsPoint.y +
                  offset * Math.sin(angle) +
                  bundleGap * Math.sin(angle - Math.PI),
              },
              lineE = {
                x:
                  gtPoint.x +
                  offset * Math.cos(angle) +
                  bundleGap * Math.cos(angle - Math.PI),
                y:
                  gtPoint.y +
                  offset * Math.sin(angle) +
                  bundleGap * Math.sin(angle - Math.PI),
              };
            return { startPoint: lineS, endPoint: lineE };
          }),
          (this.paintCurverLink = function (ctx) {
            var source = this.source,
              target = this.target;
            var sX = source.cx,
              sY = source.cy;
            var tX = this.target.cx,
              tY = this.target.cy;
            var dX = tX - sX,
              dY = tY - sY,
              sign = sX < tX ? 1 : -1,
              cp = {},
              c = {},
              angle = 0,
              t = 0.5;
            if (source.id === target.id) {
              var sSize = (source.radius / 2) * source.scaleX || 20;
              this.showArrow = false;
              cp = DGraph.util.getSelfLoopControlPoints(
                sX,
                sY,
                sSize + (this.nodeIndex * this.bundleGap) / 2
              );
              c = DGraph.util.getPointOnBezierCurve(
                t,
                sX,
                sY,
                tX,
                tY,
                cp.x1,
                cp.y1,
                cp.x2,
                cp.y2
              );
              angle = Math.atan2(1, 1);
              this.path = [];
              this.bezierPoints = [sX, sY, cp.x1, cp.y1, cp.x2, cp.y2, tX, tY];
            } else {
              cp = DGraph.util.getQuadraticControlPoint(
                sX,
                sY,
                tX,
                tY,
                4,
                this.curveness
              );
              c = DGraph.util.getPointOnQuadraticCurve(
                t,
                sX,
                sY,
                tX,
                tY,
                cp.x,
                cp.y
              );
              angle = Math.atan2(dY * sign, dX * sign);
              this.path = [];
              this.quadraticPoints = [sX, sY, cp.x, cp.y, tX, tY];
            }
            if (this.background) {
              ctx.save();
              ctx.beginPath();
              ctx.strokeStyle = `rgba(${this.background},${this.alpha})`;
              ctx.lineWidth = this.lineWidth * 3;
              ctx.moveTo(sX, sY);
              if (source.id === target.id) {
                ctx.bezierCurveTo(cp.x1, cp.y1, cp.x2, cp.y2, tX, tY);
              } else {
                ctx.quadraticCurveTo(cp.x, cp.y, tX, tY);
              }
              ctx.stroke();
              ctx.closePath();
              ctx.restore();
            }
            ctx.beginPath();
            ctx.moveTo(sX, sY);
            this.setLineStyle(ctx);
            if (source.id === target.id) {
              ctx.bezierCurveTo(cp.x1, cp.y1, cp.x2, cp.y2, tX, tY);
              this.animate = false;
            } else {
              ctx.quadraticCurveTo(cp.x, cp.y, tX, tY);
            }
            ctx.stroke(), ctx.closePath();
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintCurverAnimate(ctx, sX, sY, tX, tY, cp.x, cp.y);
            }
            if (this.showArrow) {
              var pos1 = DGraph.util.getPointOnQuadraticCurve(
                0.5,
                sX,
                sY,
                tX,
                tY,
                cp.x,
                cp.y
              );
              var pos2 = DGraph.util.getPointOnQuadraticCurve(
                0.52,
                sX,
                sY,
                tX,
                tY,
                cp.x,
                cp.y
              );
              this.paintSpecialArrow(
                ctx,
                { x: pos1.x, y: pos1.y },
                { x: pos2.x, y: pos2.y }
              );
            }
            this.paintLineText(ctx, c.x, c.y, angle);
            this.paintLineTips(ctx, { x: c.x, y: c.y });
          }),
          (this.paintCurverAnimate = function (ctx, sx, sy, tx, ty, cpx, cpy) {
            var self = this;
            if (self.animateBall && self.animateBall.moves < 1) {
              self.animateBall.moves += 0.02;
              var pos = DGraph.util.getPointOnQuadraticCurve(
                self.animateBall.moves,
                sx,
                sy,
                tx,
                ty,
                cpx,
                cpy
              );
              ctx.save();
              ctx.beginPath();
              ctx.fillStyle = `rgba(${self.animateBallColor},${self.alpha})`;
              ctx.arc(pos.x, pos.y, self.animateBallSize, 0, 2 * Math.PI);
              ctx.fill();
              ctx.closePath();
              ctx.restore();
            } else {
              self.animateBall = { moves: 0 };
            }
          }),
          (this.paintArrowLine = function (ctx, b) {
            var width = this.lineWidth;
            width = width < 4 ? 4 : width;
            var pos = { x: this.target.cx, y: this.target.cy };
            if (this.showArrow) {
              pos = this.calculateEndPoint(this.source, this.target);
            }
            var x0 = this.source.cx;
            var y0 = this.source.cy;
            var x1 = pos.x;
            var y1 = pos.y;
            if (this.reverse) {
              x0 = pos.x;
              y0 = pos.y;
              x1 = this.source.cx;
              y1 = this.source.cy;
            }
            ctx.save();
            ctx.beginPath();
            if (this.showArrow) {
              ctx.arrow(x0, y0, x1, y1, [
                -3 * width,
                width,
                -4 * width,
                3 * width + 1,
              ]);
            } else {
              ctx.arrow(x0, y0, x1, y1, [0, width]);
            }
            ctx.lineJoin = 'round';
            if (this.colorType == 'both') {
              var grd = ctx.createLinearGradient(
                this.source.cx,
                this.source.cy,
                this.target.cx,
                this.target.cy
              );
              grd.addColorStop(
                0,
                `rgba(${this.source.fillColor},${this.alpha})`
              );
              grd.addColorStop(
                1,
                `rgba(${this.target.fillColor},${this.alpha})`
              );
              ctx.fillStyle = grd;
            } else {
              ctx.fillStyle = `rgba(${this.strokeColor},${this.alpha})`;
            }
            if (this.selected || this.showSelected) {
              ctx.fillStyle = `rgba(${this.selectedColor},${this.selectedAlpha})`;
            }
            ctx.fill();
            ctx.restore();
            this.path = [
              { x: x0, y: y0 },
              { x: x1, y: y1 },
            ];
            this.paintTextOnLineWithAngle(ctx, this.source, this.target);
          }),
          (this.paintXMinderLine = function (cxt, b) {
            var source = this.source,
              target = this.target;
            var sourceX = source.cx,
              sourceY = source.cy;
            var targetX = target.cx,
              targetY = target.cy;
            if (sourceX > targetX) {
              targetX = target.x + target.width / 2;
            } else if (sourceX < targetX) {
              targetX = target.x;
            }
            cxt.beginPath();
            this.setLineStyle(cxt);
            cxt.moveTo(source.cx, source.cy);
            cxt.lineTo((sourceX + targetX) / 2, sourceY);
            cxt.lineTo((sourceX + targetX) / 2, targetY);
            cxt.lineTo(target.cx, target.cy);
            cxt.stroke();
            cxt.closePath();
            this.path = [
              { x: sourceX, y: sourceY },
              { x: (sourceX + targetX) / 2, y: sourceY },
              { x: (sourceX + targetX) / 2, y: targetY },
              { x: targetX, y: targetY },
            ];
          }),
          (this.calculateEndPoint = function (source, target) {
            var angle = 0;
            this.arrowsRadius = this.getArrowRadius();
            var offset = 0,
              posX = target.cx,
              posY = target.cy;
            if ('rect' == this.target.shape) {
              var cod = this.getPath();
              posX = cod[1].x;
              posY = cod[1].y;
              angle = Math.atan2(posY - cod[0].y, posX - cod[0].x);
            } else {
              var startPoint = { x: source.cx, y: source.cy },
                endPoint = { x: target.cx, y: target.cy };
              offset = -(
                (target.radius + target.borderWidth / 2) *
                target.scaleX
              );
              (angle = Math.atan2(
                endPoint.y - startPoint.y,
                endPoint.x - startPoint.x
              )),
                (posX = endPoint.x + offset * Math.cos(angle)),
                (posY = endPoint.y + offset * Math.sin(angle));
            }
            return { x: posX, y: posY, angle: angle };
          }),
          (this.paintDrirectLine = function (ctx) {
            var posX = this.target.cx,
              posY = this.target.cy;
            var linetX = posX,
              linetY = posY;
            if (this.showArrow) {
              var endPoint = this.calculateEndPoint(this.source, this.target);
              posX = endPoint.x;
              posY = endPoint.y;
              linetX = posX - this.arrowsRadius * Math.cos(endPoint.angle);
              linetY = posY - this.arrowsRadius * Math.sin(endPoint.angle);
            }
            this.path = [
              { x: this.source.cx, y: this.source.cy },
              { x: this.target.cx, y: this.target.cy },
            ];
            this.paintLineBackGround(ctx);
            ctx.beginPath(), ctx.moveTo(this.source.cx, this.source.cy);
            this.setLineStyle(ctx);
            ctx.lineTo(linetX, linetY), ctx.stroke(), ctx.closePath();
            if (this.showArrow) {
              var start, end;
              if ('rect' == this.target.shape) {
                var cod = this.getPath();
                (start = cod[0]), (end = cod[1]);
              } else {
                (start = { x: this.source.cx, y: this.source.cy }),
                  (end = { x: posX, y: posY });
              }
              this.paintSpecialArrow(ctx, start, end);
            }
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintAnimateBall(ctx);
            }
            this.paintTextOnLineWithAngle(ctx, this.source, this.target);
          }),
          (this.paintTextOnLineWithAngle = function (ctx, start, end) {
            if (this.showlabel && this.label) {
              let textAngle = Math.atan2(end.cy - start.cy, end.cx - start.cx);
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);
              let textPos = {
                x: start.cx + (end.cx - start.cx) / 2,
                y: start.cy + (end.cy - start.cy) / 2,
              };
              this.paintLineText(ctx, textPos.x, textPos.y, textAngle);
            }
            this.paintLineTips(ctx, {
              x: start.cx + (end.cx - start.cx) / 2,
              y: start.cy + (end.cy - start.cy) / 2,
            });
          }),
          (this.paintLineTips = function (ctx, textPos) {
            if (this.tipText) {
              var radius = this.tipRadius || 0;
              var padding = 12;
              ctx.save();
              ctx.font = this.tipFont || 'normal 13px Arial';
              var width = ctx.measureText(this.tipText).width + padding;
              var height = ctx.measureText('田').width + padding - 2;
              radius = radius > height / 2 ? height / 2 : radius;
              ctx.translate(textPos.x - width / 2, textPos.y - height - 6);
              ctx.beginPath();
              ctx.arc(width - radius, height - radius, radius, 0, Math.PI / 2);
              ctx.lineTo(width / 2 + 4, height);
              ctx.lineTo(width / 2, height + 6);
              ctx.lineTo(width / 2 - 4, height);
              ctx.lineTo(radius, height);
              ctx.arc(radius, height - radius, radius, Math.PI / 2, Math.PI);
              ctx.lineTo(0, radius);
              ctx.arc(radius, radius, radius, Math.PI, (Math.PI * 3) / 2);
              ctx.lineTo(width - radius, 0);
              ctx.arc(
                width - radius,
                radius,
                radius,
                (Math.PI * 3) / 2,
                Math.PI * 2
              );
              ctx.lineTo(width, height - radius);
              ctx.closePath();
              ctx.fillStyle = `rgba(${this.tipColor || '250,50,50'},${
                this.alpha
              })`;
              ctx.fill();
              ctx.translate(width / 2, height / 2);
              ctx.textBaseline = 'middle';
              ctx.textAlign = 'center';
              ctx.fillStyle = `rgba(${this.tipFontColor || '250,250,250'},${
                this.alpha
              })`;
              ctx.fillText(this.tipText, 0, 0);
              ctx.restore();
            }
          }),
          (this.getArrowRadius = function () {
            var raduis = Math.round(3 * this.lineWidth);
            return Math.min(Math.max(raduis, 6), 80);
          }),
          (this.getTargetBorderPoint = function () {
            var radius = 0;
            if (this.showArrow) {
              var target = this.target;
              radius = target.radius;
              if ('rect' == target.shape) {
                if (['vbezier', 'vlink'].indexOf(this.lineType) != -1) {
                  radius =
                    (target.height / 2 + target.borderWidth / 2) *
                    target.scaleX;
                } else {
                  radius =
                    (target.width / 2 + target.borderWidth / 2) * target.scaleX;
                }
              } else {
                radius =
                  (target.radius + target.borderWidth / 2) * target.scaleX;
              }
            }
            return radius;
          }),
          (this.paintTriangleArrow = function (ctx, sourceP, targetP) {
            var arrowsRadius = this.getArrowRadius() + 2;
            var angle = Math.atan2(
              targetP.y - sourceP.y,
              targetP.x - sourceP.x
            );
            ctx.save();
            ctx.translate(targetP.x, targetP.y);
            ctx.rotate(angle + 1);
            if (this.selected || this.showSelected) {
              ctx.fillStyle = `rgba(${this.selectedColor},${this.selectedAlpha})`;
            } else {
              ctx.fillStyle = `rgba(${this.strokeColor},${this.alpha})`;
            }
            ctx.beginPath();
            ctx.moveTo(0, arrowsRadius);
            ctx.lineTo(0, 0);
            ctx.rotate(-2);
            ctx.lineTo(0, -arrowsRadius);
            ctx.closePath(), ctx.fill(), ctx.restore();
          }),
          (this.paintSpecialArrow = function (ctx, sourceP, targetP) {
            if (this.arrowType == 'arrow') {
              var arrowsRadius = this.getArrowRadius();
              var angle = Math.atan(
                (targetP.x - sourceP.x) / (targetP.y - sourceP.y)
              );
              ctx.save();
              ctx.translate(targetP.x, targetP.y);
              if (targetP.y - sourceP.y >= 0) {
                ctx.rotate(-angle);
              } else {
                ctx.rotate(Math.PI - angle);
              }
              if (this.selected || this.showSelected) {
                ctx.fillStyle = `rgba(${this.selectedColor},${this.selectedAlpha})`;
              } else {
                ctx.fillStyle = `rgba(${this.strokeColor},${this.alpha})`;
              }
              ctx.beginPath();
              ctx.lineTo(-arrowsRadius, -arrowsRadius * 2);
              ctx.lineTo(0, -arrowsRadius);
              ctx.lineTo(arrowsRadius, -arrowsRadius * 2);
              ctx.lineTo(0, 0);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            } else {
              this.paintTriangleArrow(ctx, sourceP, targetP);
            }
          }),
          (this.paintVerticalLink = function (cxt) {
            var source = this.source,
              target = this.target;
            var sourceX = source.cx,
              sourceY = source.cy;
            var targetX = target.cx,
              targetY = target.cy;
            this.path = [
              { x: sourceX, y: sourceY },
              { x: sourceX, y: (sourceY + targetY) / 2 },
              { x: targetX, y: (sourceY + targetY) / 2 },
              { x: targetX, y: targetY },
            ];
            var radius = 0;
            if (this.showArrow) {
              radius = this.getTargetBorderPoint();
              if (sourceY > targetY) {
                radius = -radius;
              }
            }
            this.paintLineBackGround(cxt);
            var lastPath = this.path[this.path.length - 1];
            cxt.beginPath();
            this.setLineStyle(cxt);
            cxt.moveTo(this.path[0].x, this.path[0].y);
            for (var i = 1; i < this.path.length - 1; i++) {
              cxt.lineTo(this.path[i].x, this.path[i].y);
            }
            if (sourceY >= targetY) {
              cxt.lineTo(lastPath.x, targetY - radius + this.getArrowRadius());
            } else {
              cxt.lineTo(lastPath.x, targetY - radius - this.getArrowRadius());
            }
            cxt.stroke();
            cxt.closePath();
            if (this.showArrow) {
              this.paintSpecialArrow(
                cxt,
                { x: targetX, y: (sourceY + targetY) / 2 },
                { x: targetX, y: targetY - radius }
              );
            }
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintAnimateBall(cxt);
            }
            this.paintLineText(
              cxt,
              (sourceX + targetX) / 2,
              (targetY + sourceY) / 2
            );
            this.paintLineTips(cxt, {
              x: (sourceX + targetX) / 2,
              y: (targetY + sourceY) / 2,
            });
          }),
          (this.paintHorizolLink = function (cxt) {
            var source = this.source,
              target = this.target;
            var sourceX = source.cx,
              sourceY = source.cy;
            var targetX = target.cx,
              targetY = target.cy;
            var radius = 0;
            if (this.showArrow) {
              radius = this.getTargetBorderPoint();
              if (sourceX > targetX) {
                radius = -radius;
              }
            }
            this.path = [
              { x: sourceX, y: sourceY },
              { x: (sourceX + targetX - radius) / 2, y: sourceY },
              { x: (sourceX + targetX - radius) / 2, y: targetY },
              { x: targetX, y: targetY },
            ];
            this.paintLineBackGround(cxt);
            var lastPath = this.path[this.path.length - 1];
            cxt.beginPath();
            this.setLineStyle(cxt);
            cxt.moveTo(this.path[0].x, this.path[0].y);
            for (var i = 1; i < this.path.length - 1; i++) {
              cxt.lineTo(this.path[i].x, this.path[i].y);
            }
            if (sourceX >= targetX) {
              cxt.lineTo(targetX - radius + this.getArrowRadius(), lastPath.y);
            } else {
              cxt.lineTo(targetX - radius - this.getArrowRadius(), lastPath.y);
            }
            cxt.stroke();
            cxt.closePath();
            if (this.showArrow) {
              this.paintSpecialArrow(
                cxt,
                { x: (sourceX + targetX) / 2, y: targetY },
                { x: targetX - radius, y: targetY }
              );
            }
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintAnimateBall(cxt);
            }
            this.paintLineText(
              cxt,
              (sourceX + targetX) / 2,
              (targetY + sourceY) / 2
            );
            this.paintLineTips(cxt, {
              x: (sourceX + targetX) / 2,
              y: (targetY + sourceY) / 2,
            });
          }),
          (this.paintLineBackGround = function (ctx) {
            if (this.background) {
              ctx.save();
              ctx.beginPath(), (ctx.lineCap = 'round');
              ctx.lineJoin = 'round';
              ctx.moveTo(this.path[0].x, this.path[0].y);
              for (var i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
              }
              ctx.strokeStyle = `rgba(${this.background},${this.alpha})`;
              ctx.lineWidth = this.lineWidth * 3;
              ctx.stroke(), ctx.closePath();
              ctx.restore();
            }
          }),
          (this.paintBezier = function (cxt) {
            var angle = DGraph.util.calculateAngle(
              this.source.cx,
              this.source.cy,
              this.target.cx,
              this.target.cy
            );
            if (
              (angle >= 0 && angle <= 45) ||
              (angle >= 135 && angle <= 225) ||
              (angle >= 315 && angle <= 360)
            ) {
              this.paintVBezierLink(cxt);
            } else {
              this.paintHBezierLink(cxt);
            }
          }),
          (this.paintHBezierLink = function (cxt) {
            var source = this.source,
              target = this.target;
            var sourceX = source.cx,
              sourceY = source.cy;
            var targetX = target.cx,
              targetY = target.cy;
            var radius = 0;
            if (this.showArrow) {
              (targetX =
                target.cx -
                (target.width / 2 + target.borderWidth / 2) * target.scaleX -
                this.getArrowRadius()),
                (targetY = target.cy),
                (radius = this.getTargetBorderPoint());
              if (sourceX > target.cx) {
                targetX =
                  target.cx +
                  (target.width / 2 + target.borderWidth / 2) * target.scaleX +
                  this.getArrowRadius();
                radius = -radius;
              }
            }
            var x3 = (sourceX + targetX) * this.curveness;
            (y3 = sourceY),
              (x4 = (sourceX + targetX) * this.curveness),
              (y4 = targetY);
            if (this.background) {
              cxt.save();
              cxt.beginPath();
              cxt.strokeStyle = `rgba(${this.background},${this.alpha})`;
              cxt.lineWidth = this.lineWidth * 3;
              cxt.moveTo(sourceX, sourceY);
              cxt.bezierCurveTo(x3, y3, x4, y4, targetX, targetY);
              cxt.lineTo(target.cx, target.cy);
              cxt.stroke();
              cxt.closePath();
              cxt.restore();
            }
            cxt.beginPath();
            this.setLineStyle(cxt);
            cxt.moveTo(sourceX, sourceY);
            cxt.bezierCurveTo(x3, y3, x4, y4, targetX, targetY);
            cxt.stroke();
            cxt.closePath();
            this.path = [];
            this.bezierPoints = [
              sourceX,
              sourceY,
              x3,
              y3,
              x4,
              y4,
              targetX,
              targetY,
            ];
            if (this.showArrow) {
              this.paintSpecialArrow(
                cxt,
                { x: targetX, y: targetY },
                { x: target.cx - radius, y: target.cy }
              );
            }
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintBezierAnimate(
                cxt,
                source.cx,
                source.cy,
                targetX,
                targetY,
                x3,
                y3,
                x4,
                y4
              );
            }
            this.paintBezierText(
              cxt,
              source.cx,
              source.cy,
              targetX,
              targetY,
              x3,
              y3,
              x4,
              y4
            );
          }),
          (this.paintVBezierLink = function (cxt) {
            var source = this.source,
              target = this.target;
            var sourceX = source.cx,
              sourceY = source.cy;
            var targetX = target.cx,
              targetY = target.cy;
            var radius = 0;
            if (this.showArrow) {
              (targetX = target.cx),
                (targetY =
                  target.cy -
                  (target.height / 2 + target.borderWidth / 2) * target.scaleY -
                  this.getArrowRadius());
              radius = this.getTargetBorderPoint();
              if (sourceY > target.cy) {
                targetY =
                  target.cy +
                  (target.height / 2 + target.borderWidth / 2) * target.scaleY +
                  this.getArrowRadius();
                radius = -radius;
              }
            }
            var x3 = sourceX;
            var y3 = (sourceY + targetY) * this.curveness;
            var x4 = targetX;
            var y4 = (sourceY + targetY) * this.curveness;
            if (this.background) {
              cxt.save();
              cxt.beginPath();
              cxt.strokeStyle = `rgba(${this.background},${this.alpha})`;
              cxt.lineWidth = this.lineWidth * 3;
              cxt.moveTo(source.cx, source.cy);
              cxt.bezierCurveTo(x3, y3, x4, y4, targetX, targetY);
              cxt.lineTo(targetX, target.cy);
              cxt.stroke();
              cxt.closePath();
              cxt.restore();
            }
            cxt.beginPath();
            this.setLineStyle(cxt);
            cxt.moveTo(source.cx, source.cy);
            cxt.bezierCurveTo(x3, y3, x4, y4, targetX, targetY);
            cxt.stroke();
            cxt.closePath();
            this.path = [];
            this.bezierPoints = [
              source.cx,
              source.cy,
              x3,
              y3,
              x4,
              y4,
              targetX,
              targetY,
            ];
            if (this.showArrow) {
              this.paintSpecialArrow(
                cxt,
                { x: targetX, y: targetY },
                { x: target.cx, y: target.cy - radius }
              );
            }
            this.paintBezierText(
              cxt,
              source.cx,
              source.cy,
              targetX,
              targetY,
              x3,
              y3,
              x4,
              y4
            );
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintBezierAnimate(
                cxt,
                source.cx,
                source.cy,
                targetX,
                targetY,
                x3,
                y3,
                x4,
                y4
              );
            }
          }),
          (this.paintBezierAnimate = function (
            ctx,
            sx,
            sy,
            tx,
            ty,
            cpx1,
            cpy1,
            cpx2,
            cpy2
          ) {
            var self = this;
            if (self.animateBall && self.animateBall.moves < 1) {
              self.animateBall.moves += 0.02;
              var pos = DGraph.util.getPointOnBezierCurve(
                self.animateBall.moves,
                sx,
                sy,
                tx,
                ty,
                cpx1,
                cpy1,
                cpx2,
                cpy2
              );
              ctx.save();
              ctx.beginPath();
              ctx.fillStyle = `rgba(${self.animateBallColor},${self.alpha})`;
              ctx.arc(pos.x, pos.y, self.animateBallSize, 0, 2 * Math.PI);
              ctx.fill();
              ctx.closePath();
              ctx.restore();
            } else {
              self.animateBall = { moves: 0 };
            }
          }),
          (this.paintBezierText = function (
            cxt,
            sx,
            sy,
            tx,
            ty,
            cpx1,
            cpy1,
            cpx2,
            cpy2
          ) {
            if (this.showlabel && this.label) {
              var middle = DGraph.util.getPointOnBezierCurve(
                0.5,
                sx,
                sy,
                tx,
                ty,
                cpx1,
                cpy1,
                cpx2,
                cpy2
              );
              if (['gephiline', 'curver'].indexOf(this.lineType) > -1) {
                var sign = cpx2 - cpx1 > 0 ? -1 : 1;
                var angle =
                  Math.atan2((cpx2 - cpx1) * sign, (cpy2 - cpy1) * -sign) +
                  Math.PI / 2;
                this.paintLineText(cxt, middle.x, middle.y, angle);
              } else {
                this.paintLineText(cxt, middle.x, middle.y);
              }
              this.paintLineTips(cxt, { x: middle.x, y: middle.y });
            } else {
              if (this.tipText) {
                var middle = DGraph.util.getPointOnBezierCurve(
                  0.5,
                  sx,
                  sy,
                  tx,
                  ty,
                  cpx1,
                  cpy1,
                  cpx2,
                  cpy2
                );
                this.paintLineTips(cxt, { x: middle.x, y: middle.y });
              }
            }
          }),
          (this.paintLineText = function (cxt, posX, posY, angle) {
            if (!this.showlabel || !this.label) {
              return false;
            }
            var baseLine = 'bottom';
            if (this.tipText) {
              baseLine = 'top';
            }
            if (this.labelBackGround) {
              var textPadding = 4;
              baseLine = 'middle';
              cxt.save();
              cxt.font = this.font;
              var textWidth =
                cxt.measureText(this.label).width + textPadding * 2;
              var textHeight = cxt.measureText('田').width + textPadding;
              this.labelBackHeight = textHeight;
              cxt.translate(posX, posY);
              cxt.rotate(angle ? angle : 0);
              cxt.lineWidth = 1;
              cxt.strokeStyle = `rgba(${this.labelBorderColor},${this.alpha})`;
              cxt.fillStyle = `rgba(${this.labelBackGround},${this.alpha})`;
              cxt.DGraphRoundRect(
                -textWidth / 2,
                -textHeight / 2 - 1,
                textWidth,
                textHeight,
                textHeight / 2 - textPadding
              );
              cxt.fill(), cxt.stroke(), cxt.restore();
            }
            cxt.save();
            cxt.font = this.font;
            cxt.translate(posX, posY);
            cxt.rotate(angle ? angle : 0);
            cxt.textAlign = 'center';
            cxt.textBaseline = baseLine;
            cxt.fillStyle = `rgba(${this.fontColor},${this.alpha})`;
            cxt.fillText(this.label, 0, 0);
            cxt.restore();
          }),
          (this.paintGephiLine = function (ctx, label) {
            var self = this;
            var source = {
              x: self.source.cx,
              y: self.source.cy,
              r: self.width,
            };
            var target = {
              x: self.target.cx,
              y: self.target.cy,
              r: self.width,
            };
            var arrow_size = self.lineWidth * 3.5;
            var x2, y2, x3, y3, x4, y4, x5, y5;
            x2 = source.x;
            y2 = source.y;
            x3 =
              0.3 * target.y - 0.3 * source.y + 0.8 * source.x + 0.2 * target.x;
            y3 =
              0.8 * source.y + 0.2 * target.y - 0.3 * target.x + 0.3 * source.x;
            x4 =
              0.3 * target.y - 0.3 * source.y + 0.2 * source.x + 0.8 * target.x;
            y4 =
              0.2 * source.y + 0.8 * target.y - 0.3 * target.x + 0.3 * source.x;
            x5 = target.x;
            y5 = target.y;
            if (this.background) {
              ctx.save();
              ctx.beginPath();
              ctx.strokeStyle = `rgba(${this.background},${this.alpha})`;
              ctx.lineWidth = this.lineWidth * 3;
              ctx.moveTo(x2, y2);
              ctx.bezierCurveTo(x3, y3, x4, y4, x5, y5);
              ctx.stroke();
              ctx.closePath();
              ctx.restore();
            }
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            this.setLineStyle(ctx);
            ctx.bezierCurveTo(x3, y3, x4, y4, x5, y5);
            ctx.stroke();
            this.path = [];
            this.bezierPoints = [x2, y2, x3, y3, x4, y4, x5, y5];
            if (
              this.animate &&
              (this.lineDash == null || this.lineDash.length <= 1)
            ) {
              this.paintBezierAnimate(ctx, x2, y2, x5, y5, x3, y3, x4, y4);
            }
            if (self.showArrow) {
              var pos1 = DGraph.util.getPointOnBezierCurve(
                0.5,
                x2,
                y2,
                x5,
                y5,
                x3,
                y3,
                x4,
                y4
              );
              var pos2 = DGraph.util.getPointOnBezierCurve(
                0.52,
                x2,
                y2,
                x5,
                y5,
                x3,
                y3,
                x4,
                y4
              );
              this.paintSpecialArrow(ctx, pos1, pos2);
            }
            this.paintBezierText(ctx, x2, y2, x5, y5, x3, y3, x4, y4);
          });
      }
      (Link.prototype = new DGraph.InteractiveElement()),
        (DGraph.Link = Link),
        (Edge.prototype = new Link()),
        (DGraph.Edge = Edge);
    })(DGraph),
    (function (DGraph) {
      function Group(label, fixed = false) {
        (this.initialize = function (label, fixed = false) {
          Group.prototype.initialize.apply(this, arguments),
            (this.elementType = 'group'),
            (this.zIndex = DGraph.Group_zIndex),
            (this.fixed = fixed),
            (this.width = 100),
            (this.height = 100),
            (this.childs = []),
            (this.alpha = 1),
            (this.dragable = true),
            (this.childDragable = true),
            (this.visible = true),
            (this.fillColor = '250,250,250'),
            (this.borderWidth = 1),
            (this.borderColor = '100,100,220'),
            (this.selectedBorderWidth = 2),
            (this.selectedBorderColor = '30,30,250'),
            (this.showHeader = true),
            (this.label = label),
            (this.textAlign = 'center'),
            (this.textOffsetX = 6);
          (this.font = 'normal 14px Arial'),
            (this.fontColor = '255,255,255'),
            (this.headerColor = '60,60,200'),
            (this.headerAlpha = 1),
            (this.headerHeight = 36),
            (this.padding = 20);
        }),
          this.initialize(label, fixed),
          (this.add = function (nodes) {
            var self = this;
            if (nodes instanceof Array) {
              nodes.forEach((node) => {
                self.childs.push(node);
                node.parentContainer = this;
              });
            } else {
              self.childs.push(nodes);
              nodes.parentContainer = this;
            }
          }),
          (this.remove = function (node) {
            for (var i = 0; i < this.childs.length; i++) {
              if (this.childs[i] === node) {
                node.dragable = true;
                node.parentContainer = null;
                this.childs = this.childs.del(i);
                break;
              }
            }
          }),
          (this.removeAll = function () {
            this.childs.forEach((child) => {
              child.dragable = true;
              child.parentContainer = null;
            });
            this.childs = [];
          }),
          (this.setLocation = function (x, y) {
            var offsetX = x - this.x,
              offsetY = y - this.y;
            (this.x = x), (this.y = y);
            for (var i = 0; i < this.childs.length; i++) {
              var node = this.childs[i];
              node.setLocation(node.x + offsetX, node.y + offsetY);
            }
          }),
          (this.paint = function (ctx) {
            if (this.visible) {
              if (!this.fixed) {
                this.ajustSize();
              }
              ctx.save();
              ctx.beginPath();
              ctx.rect(this.x, this.y, this.width, this.height);
              ctx.closePath(),
                (ctx.fillStyle = `rgba(${this.fillColor},${this.alpha})`),
                ctx.fill();
              if (
                !this.showSelected &&
                !this.selected &&
                this.borderWidth > 0
              ) {
                ctx.lineWidth = this.borderWidth;
                ctx.strokeStyle = `rgba(${this.borderColor},${this.alpha})`;
                ctx.stroke();
              }
              if (
                (this.showSelected || this.selected) &&
                this.selectedBorderWidth > 0
              ) {
                ctx.lineWidth = this.selectedBorderWidth;
                ctx.strokeStyle = `rgba(${this.selectedBorderColor},${this.alpha})`;
                ctx.stroke();
              }
              ctx.restore();
              if (this.showHeader) {
                this.paintHeader(ctx);
                this.paintText(ctx);
              }
            }
          }),
          (this.paintHeader = function (ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.headerHeight);
            ctx.closePath();
            (ctx.fillStyle = `rgba(${this.headerColor},${this.headerAlpha})`),
              ctx.fill();
            var lineWidth = this.borderWidth;
            if (this.showSelected || this.selected) {
              lineWidth = this.selectedBorderWidth;
            }
            if (lineWidth > 0) {
              ctx.lineWidth = lineWidth;
              (ctx.strokeStyle = `rgba(${this.headerColor},${this.headerAlpha})`),
                ctx.stroke();
            }
            ctx.restore();
          }),
          (this.paintText = function (ctx) {
            if (this.label) {
              ctx.save();
              ctx.font = this.font;
              var textWidth = ctx.measureText(this.label).width;
              var pos = this.getTextPostion(textWidth);
              ctx.textBaseline = 'middle';
              ctx.fillStyle = `rgba(${this.fontColor},${this.headerAlpha})`;
              ctx.fillText(this.label, pos.x, pos.y);
              ctx.restore();
            }
          }),
          (this.getTextPostion = function (textWidth) {
            var position = null;
            switch (this.textAlign) {
              case 'center':
                position = {
                  x: this.x + this.width / 2 - textWidth / 2,
                  y: this.y + this.headerHeight / 2,
                };
                break;
              case 'right':
                position = {
                  x: this.x + this.width - textWidth - this.textOffsetX,
                  y: this.y + this.headerHeight / 2,
                };
                break;
              default:
                position = {
                  x: this.x + this.textOffsetX,
                  y: this.y + this.headerHeight / 2,
                };
                break;
            }
            return position;
          }),
          (this.paintMouseover = function (ctx) {
            this.showSelected = true;
          }),
          (this.isInBound = function (x, y) {
            return (
              x > this.x &&
              x < this.x + this.width &&
              y > this.y &&
              y < this.y + this.height
            );
          }),
          (this.ajustSize = function () {
            var self = this;
            var nodeCount = self.childs.length;
            if (nodeCount > 0) {
              var left = 1e7,
                right = -1e7,
                top = 1e7,
                bottom = -1e7,
                width = right - left,
                height = bottom - top;
              for (var i = 0; i < nodeCount; i++) {
                var node = self.childs[i];
                node.dragable = self.childDragable;
                var scaleX = node.scaleX == 1 ? 0 : node.scaleX;
                var scaleY = node.scaleY == 1 ? 0 : node.scaleY;
                node.x <= left && (left = node.x - (node.width * scaleX) / 2),
                  node.x >= right && (right = node.x),
                  node.y <= top && (top = node.y - (node.height * scaleY) / 2),
                  node.y >= bottom && (bottom = node.y),
                  (width = right - left + node.width * node.scaleX),
                  (height = bottom - top + node.height * node.scaleY);
              }
              self.x = left - self.padding;
              self.y = top - self.padding - self.headerHeight;
              self.width = Math.max(width, 60) + self.padding * 2;
              self.height =
                Math.max(height, 60) + self.padding * 2 + self.headerHeight;
            }
          });
      }
      (Group.prototype = new DGraph.InteractiveElement()),
        (DGraph.Group = Group);
    })(DGraph),
    (function (DGraph) {
      function ColorUtils() {
        function hexToRgb(hex) {
          var h = hex.replace('#', '');
          return [
            parseInt(h.substring(0, 2), 16),
            parseInt(h.substring(2, 4), 16),
            parseInt(h.substring(4, 6), 16),
          ];
        }
        function hexToRgbStr(hex) {
          var rgb = hexToRgb(hex);
          return `${rgb[0]},${rgb[1]},${rgb[2]}`;
        }
        function hex(c) {
          var s = '0123456789abcdef';
          var i = parseInt(c, 10);
          if (i === 0 || isNaN(c)) {
            return '00';
          }
          i = Math.round(Math.min(Math.max(0, i), 255));
          return s.charAt((i - (i % 16)) / 16) + s.charAt(i % 16);
        }
        function convertRgbToHex(rgb) {
          var aColor = rgb
            .replace(/(?:(|)|rgb|RGB)*/g, '')
            .replace('(', '')
            .replace(')', '')
            .split(',');
          return '#' + hex(aColor[0]) + hex(aColor[1]) + hex(aColor[2]);
        }
        function generateGradientColor(colorStart, colorEnd, colorCount) {
          var start = hexToRgb(colorStart);
          var end = hexToRgb(colorEnd);
          var len = colorCount;
          var alpha = 0.0;
          var rt = [];
          for (var i = 0; i < len; i++) {
            var c = [];
            alpha += 1.0 / len;
            c[0] = start[0] * alpha + (1 - alpha) * end[0];
            c[1] = start[1] * alpha + (1 - alpha) * end[1];
            c[2] = start[2] * alpha + (1 - alpha) * end[2];
            rt.push(`${c[0]},${c[1]},${c[2]}`);
          }
          return rt;
        }
        return {
          generateGradientColor: generateGradientColor,
          colorHex: hexToRgbStr,
          convertRgbToHex: convertRgbToHex,
        };
      }
      DGraph.ColorUtils = ColorUtils;
    })(DGraph);
  var VisualGraph = function (container, config) {
    if (container == null) {
      return;
    }
    this.defaultConfig = {
      node: {
        label: {
          show: true,
          color: '50,50,50',
          font: 'normal 14px Arial',
          wrapText: false,
          textPosition: 'Middle_Center',
          textOffsetX: 0,
          textOffsetY: 0,
          background: null,
          borderWidth: 0,
          borderColor: null,
        },
        shape: 'circle',
        color: '30,160,255',
        borderColor: '20,20,20',
        borderAlpha: 1,
        borderWidth: 0,
        borderRadius: 0,
        lineDash: [0],
        alpha: 1,
        size: 0,
        width: 60,
        height: 60,
        image: null,
        selected: {
          borderColor: '65,95,240',
          borderAlpha: 1,
          borderWidth: 5,
          showShadow: false,
          shadowColor: '80,160,240',
          shadowBlur: 10,
        },
        onClick: function (event, node) {},
        ondblClick: function (event, node) {},
        onMouseUp: function (event, node) {},
        onMouseDown: function (event, node) {},
        onMouseOver: function (event, node) {},
        onMouseOut: function (event, node) {},
        onMousedrag: function (event, node) {},
      },
      link: {
        label: { show: true, color: '20,20,20', font: 'normal 13px Arial' },
        lineType: 'direct',
        colorType: 'defined',
        color: '10,10,10',
        alpha: 1,
        lineWidth: 2,
        lineDash: [0],
        showArrow: true,
        arrowType: 'arrow',
        selected: {
          color: '255,0,0',
          alpha: 1,
          lineWidth: 8,
          showShadow: false,
          shadowColor: '10,250,10',
        },
        onClick: function (event, link) {},
        ondblClick: function (event, link) {},
        onMouseOver: function (event, link) {},
        onMouseOut: function (event, link) {},
      },
      highLightNeiber: true,
      wheelZoom: 1,
      noElementClick: function (event, graphvis) {},
    };
    var self = this;
    this.autoLayout = false;
    this.forceOptions = {
      size: [1200, 800],
      friction: 0.75,
      linkDistance: 120,
      linkStrength: 0.05,
      charge: -200,
      gravity: 0.0001,
      noverlap: false,
      alpha: 0.8,
      theta: 0.5,
      loopName: null,
    };
    if (!config) {
      this.config = this.defaultConfig;
    } else {
      this.config = this.deepExtend(this.defaultConfig, config, true, true);
      if (
        this.config.layout &&
        this.config.layout['type'] == 'force' &&
        this.config.layout['options']
      ) {
        this.autoLayout = true;
        (this.forceOptions.friction =
          Number(self.config.layout.options['friction']) || 0.9),
          (this.forceOptions.linkDistance =
            Number(self.config.layout.options['linkDistance']) || 150),
          (this.forceOptions.linkStrength =
            Number(self.config.layout.options['linkStrength']) || 0.05),
          (this.forceOptions.charge =
            Number(self.config.layout.options['charge']) || -150),
          (this.forceOptions.gravity =
            Number(self.config.layout.options['gravity']) || 0.01),
          (this.forceOptions.noverlap =
            self.config.layout.options['noverlap'] || false);
      }
    }
    var miniMapConfig = this.deepExtend(
      { container: 'default', width: 200, height: 160, viewColor: '#3ca9f1' },
      this.config.miniMap || {},
      true,
      true
    );
    this.stage = new DGraph.Stage(container, miniMapConfig);
    this.canvas = this.stage.canvas;
    this.scene = null;
    this.nodes = [];
    this.links = [];
    this.nodeIdIndex = 1;
    this.currentNode = null;
    this.currentLink = null;
    this.showLinkFlag = true;
    this.isDerictedGraph = true;
    this.clusterGroups = [];
    this.currentCluster = null;
    this.currentLayout = null;
    this.drawLinkFlag = false;
    this.virNode = null;
    this.drawLineCallback = function (link) {
      return link;
    };
    this.sceneEvent = null;
    this.defaultNodeColor = this.config.node.color;
    this.highLightNeiber = this.config.highLightNeiber;
    this.forceOptions.size = [self.canvas.width, self.canvas.height];
    this.init();
  };
  VisualGraph.prototype.init = function () {
    var self = this;
    this.stage.wheelZoom = this.config.wheelZoom;
    if (self.scene != null) {
      self.scene.clear();
      self.stage.remove(self.scene);
    }
    self.scene = new DGraph.Scene(this.stage);
    self.nodes = [];
    self.links = [];
    self.initDrawLinkBase();
  };
  VisualGraph.prototype.initDrawLinkBase = function () {
    var _self = this;
    var virNode = new DGraph.Node();
    virNode.shape = 'circle';
    virNode.radius = 1;
    virNode.width = 2;
    virNode.height = 2;
    virNode.show = false;
    virNode.alpha = 0;
    _self.virNode = virNode;
    _self.scene.mousemove(function (e) {
      if (_self.drawLinkFlag) {
        if (!_self.virNode.show) {
          _self.virNode.show = true;
          _self.scene.add(_self.virNode);
        }
        if (_self.virLink == null) {
          var linkConfig = _self.config['link'];
          var virLink = new DGraph.Edge(_self.currentNode, _self.virNode);
          virLink.lineWidth = linkConfig['lineWidth'];
          virLink.showArrow = linkConfig['showArrow'];
          virLink.strokeColor = linkConfig['color'];
          virLink.selectedColor = linkConfig['color'];
          virLink.lineDash = [3, 5, 5];
          _self.virLink = virLink;
          _self.scene.add(_self.virLink);
        }
        _self.virNode.cx = e.x - 2;
        _self.virNode.cy = e.y + 2;
      }
    });
    _self.scene.dbclick(function (e) {
      _self.drawLinkFlag = false;
      if (_self.virNode.show) {
        _self.virNode.show = false;
        _self.scene.remove(_self.virNode);
      }
      if (_self.virLink) {
        _self.scene.remove(_self.virLink);
        _self.virLink = null;
      }
    });
    _self.scene.click(function (e) {
      _self.hideAllRightMenu();
      if (e.target == null) {
        if (_self.highLightNeiber) {
          _self.restoreHightLight();
        }
      }
    });
    _self.scene.mouseup(function (e) {
      if (e.target == null) {
        _self.hideAllRightMenu();
        _self.currentNode = null;
        _self.currentLink = null;
        if (_self.highLightNeiber) {
          _self.restoreHightLight();
        }
        var noElementClick = _self.config['noElementClick'];
        if (noElementClick && typeof noElementClick === 'function') {
          noElementClick(e, _self);
        }
      } else {
        if (e.target.elementType == 'node') {
          _self.currentLink = null;
        } else {
          _self.currentNode = null;
        }
      }
    });
  };
  VisualGraph.prototype.deepExtend = function (
    a,
    b,
    protoExtend,
    allowDeletion
  ) {
    for (var prop in b) {
      if (b.hasOwnProperty(prop) || protoExtend === true) {
        if (b[prop] && b[prop].constructor === Object) {
          if (a[prop] === undefined) {
            a[prop] = {};
          }
          if (a[prop].constructor === Object) {
            this.deepExtend(a[prop], b[prop], protoExtend);
          } else {
            if (
              b[prop] === null &&
              a[prop] !== undefined &&
              allowDeletion === true
            ) {
              delete a[prop];
            } else {
              a[prop] = b[prop];
            }
          }
        } else if (Array.isArray(b[prop])) {
          a[prop] = [];
          for (let i = 0; i < b[prop].length; i++) {
            a[prop].push(b[prop][i]);
          }
        } else {
          if (
            b[prop] === null &&
            a[prop] !== undefined &&
            allowDeletion === true
          ) {
            delete a[prop];
          } else {
            a[prop] = b[prop];
          }
        }
      }
    }
    return a;
  };
  VisualGraph.prototype.hideAllRightMenu = function () {
    var _self = this;
    if (_self.config.hasOwnProperty('rightMenu')) {
      if (_self.config.rightMenu.hasOwnProperty('nodeMenu')) {
        var nodeHide = _self.config['rightMenu']['nodeMenu']['hide'];
        if (typeof nodeHide === 'function') {
          _self.config['rightMenu']['nodeMenu'].hide();
        }
      }
      if (_self.config.rightMenu.hasOwnProperty('linkMenu')) {
        var linkHide = _self.config['rightMenu']['linkMenu']['hide'];
        if (typeof linkHide === 'function') {
          _self.config['rightMenu']['linkMenu'].hide();
        }
      }
      if (_self.config.rightMenu.hasOwnProperty('clusterMenu')) {
        var clusterHide = _self.config['rightMenu']['clusterMenu']['hide'];
        if (typeof clusterHide === 'function') {
          _self.config['rightMenu']['clusterMenu'].hide();
        }
      }
    }
  };
  VisualGraph.prototype.drawData = function (data) {
    var self = this;
    if (data == null) {
      return;
    }
    this.init();
    var nodeIdMapNode = {};
    (data.nodes || []).forEach(function (n, i) {
      n.scale = 1;
      var node = self.newNode(n, i);
      node.showlabel = self.config.node.label.show;
      self.scene.add(node);
      self.nodes.push(node);
      nodeIdMapNode[n.id] = node;
    });
    (data.links || []).forEach(function (l) {
      var sourceId = l.source;
      var targetId = l.target;
      var source = nodeIdMapNode[sourceId];
      if (source == undefined || source == null) {
        var n = { id: sourceId };
        var source = self.newNode(n, 0);
        source.visible = true;
        self.scene.add(source);
        self.nodes.push(source);
        nodeIdMapNode[n.id] = source;
      }
      var target = nodeIdMapNode[targetId];
      if (target == undefined || target == null) {
        var n = { id: targetId };
        target = self.newNode(n, 0);
        target.visible = true;
        self.scene.add(target);
        self.nodes.push(target);
        nodeIdMapNode[n.id] = target;
      }
      if (source && target) {
        var link = self.newEdge(source, target);
        link.showlabel = l.showlabel || self.config.link.label.show;
        link.fontColor = l.fontColor || self.config.link.label.color;
        link.font = l.font || self.config.link.label.font;
        link.colorType = l.colorType || self.config.link.colorType;
        link.strokeColor = l.color || self.config.link.color;
        link.lineType = l.lineType || self.config.link.lineType;
        link.type = l.type || '';
        link.id = l.id || '';
        link.label = l.label || l.type || '';
        link.weight = l.weight || 2;
        link.value = l.value || 2;
        link.lineWidth = l.lineWidth || self.config.link.lineWidth;
        link.properties = l.properties || {};
        self.scene.add(link);
        self.links.push(link);
      }
    });
    self.refresh();
    if (self.autoLayout) {
      self.runLayoutEngin(self.nodes, self.links, 0.9);
    }
  };
  VisualGraph.prototype.customStyle = function (callback) {
    if (callback && typeof callback === 'function') {
      return callback(this.stage.graphics);
    }
    return null;
  };
  VisualGraph.prototype.translateToCenter = function () {
    this.scene.translateToCenter();
    this.refresh();
  };
  VisualGraph.prototype.getColor = function (n) {
    var color = n.color;
    if (color) {
      color = color.replace('rgb(', '').replace(')', '');
    } else {
      color = this.defaultNodeColor;
    }
    return color;
  };
  VisualGraph.prototype.addNodesInGroup = function (conf, childNodes) {
    conf = conf || {};
    var group = new DGraph.Group(conf.label, conf.fixed || false);
    group.x = conf.x || 500;
    group.y = conf.y || 300;
    group.fillColor = conf.color || '150,250,200';
    group.alpha = conf.alpha || 0.8;
    group.width = conf.width || 100;
    group.height = conf.height || 100;
    this.scene.add(group);
    if (Array.isArray(childNodes)) {
      childNodes.forEach((node) => {
        group.add(node);
      });
    } else {
      group.add(childNodes);
    }
    this.refresh();
    return group;
  };
  VisualGraph.prototype.createGroup = function (conf) {
    conf = conf || {};
    var group = new DGraph.Group(conf.label, conf.fixed || false);
    group.x = conf.x || 10;
    group.y = conf.y || 10;
    group.fillColor = conf.color || '150,250,200';
    group.alpha = conf.alpha || 0.8;
    group.width = conf.width || 100;
    group.height = conf.height || 100;
    this.scene.add(group);
    this.refresh();
    return group;
  };
  VisualGraph.prototype.newNode = function (n) {
    var self = this;
    var node = new DGraph.Node();
    node.x =
      n.x == null ? Math.round(Math.random() * this.stage.canvas.width) : n.x;
    node.y =
      n.y == null ? Math.round(Math.random() * this.stage.canvas.height) : n.y;
    node.id = n.id;
    node.type = n.type || 'default';
    node.cluster = n.cluster || 'default';
    node.scaleX = node.scaleY = n.scale || Number(1);
    node.label = n.label || n.id;
    node.alpha = n.alpha || self.config.node.alpha;
    node.fontColor = n.fontColor || self.config.node.label.color;
    node.textPosition = n.textPosition || self.config.node.label.textPosition;
    node.font = n.font || self.config.node.label.font;
    node.borderWidth = n.borderWidth || self.config.node.borderWidth;
    node.borderRadius = n.borderRadius || self.config.node.borderRadius;
    node.borderColor = n.borderColor || self.config.node.borderColor;
    node.borderAlpha = n.borderAlpha || self.config.node.borderAlpha;
    node.showlabel = n.showlabel || self.config.node.label.show;
    node.wrapText = self.config.node.label.wrapText;
    node.showShadow = n.showShadow || self.config.node.selected.showShadow;
    node.shadowColor = n.shadowColor || self.config.node.selected.shadowColor;
    node.shadowBlur = n.shadowBlur || self.config.node.selected.shadowBlur;
    node.selectedBorderColor =
      n.selectedBorderColor || self.config.node.selected.borderColor;
    node.selectedBorderAlpha =
      n.selectedBorderAlpha || self.config.node.selected.borderAlpha;
    node.selectedBorderWidth =
      n.selectedBorderWidth || self.config.node.selected.borderWidth;
    node.lineDash = n.lineDash || self.config.node.lineDash;
    node.labelBackGround =
      n.labelBackGround || self.config.node.label.background;
    node.labelBorderWidth =
      n.labelBorderWidth || self.config.node.label.borderWidth;
    node.labelBorderColor =
      n.labelBorderColor || self.config.node.label.borderColor;
    node.textOffsetX = n.textOffsetX || self.config.node.label.textOffsetX;
    node.textOffsetY = n.textOffsetY || self.config.node.label.textOffsetY;
    node.icon = n.icon;
    node.tipText = n.tipText;
    node.weight = 1;
    node.px = node.x;
    node.py = node.y;
    node.charge = self.forceOptions.charge;
    node.properties = n.properties || {};
    if (self.config.clusters && self.config.clusters[node.cluster]) {
      node.fillColor =
        self.config.clusters[node.cluster]['color'] || self.config.node.color;
      node.shape =
        self.config.clusters[node.cluster]['shape'] || self.config.node.shape;
      node.size =
        self.config.clusters[node.cluster]['size'] || self.config.node.size;
    } else {
      node.fillColor = self.getColor(n);
      node.shape = n.shape || self.config.node.shape;
      node.size = n.size || self.config.node.size;
    }
    if (!node.size) {
      node.width = n.width || self.config.node.width;
      node.height = n.height || self.config.node.height;
    } else {
      node.width = node.height = node.size;
    }
    if (n.image && n.image.length > 0) {
      node.setImage(n.image);
    } else {
      node.setImage(self.config.node.image || '');
    }
    node.click(function (event) {
      if (self.drawLinkFlag && self.virLink != null) {
        var link = self.newEdge(self.virLink.source, this);
        link.strokeColor = self.config.link.color;
        self.links.push(link);
        self.scene.add(link);
        if (self.virNode.show) {
          self.virNode.show = false;
          self.scene.remove(self.virNode);
        }
        self.drawLinkFlag = false;
        if (self.virLink) {
          self.scene.remove(self.virLink);
          self.virLink = null;
        }
        if (
          self.drawLineCallback &&
          typeof self.drawLineCallback === 'function'
        ) {
          self.drawLineCallback(link);
        }
      }
      self.currentNode = this;
      this.fixed = true;
      this.dx = this.x;
      this.dy = this.y;
      if (self.highLightNeiber) {
        self.restoreHightLight();
        self.highLightNeiberNodes(this, 0.1);
      }
      if (self.config.node.hasOwnProperty('onClick')) {
        var onClick = self.config.node['onClick'];
        if (typeof onClick === 'function') {
          onClick(event, this);
        }
      }
    });
    node.dbclick(function (evt) {
      if (self.config.node.hasOwnProperty('ondblClick')) {
        var ondblClick = self.config.node['ondblClick'];
        if (typeof ondblClick === 'function') {
          ondblClick(event, this);
        }
      }
      this.fixed = !this.fixed;
    });
    node.mousedrag(function (evt) {
      var _node = this;
      if (this.isDragging || self.scene.selectedElements.length > 1) {
        return false;
      }
      this.isDragging = true;
      this.fixed = true;
      if (self.autoLayout) {
        self.runLayoutEngin(self.nodes, self.links, 0.5);
      }
      if (self.config.node.hasOwnProperty('onMousedrag')) {
        var onMousedrag = self.config.node['onMousedrag'];
        if (typeof onMousedrag === 'function') {
          onMousedrag(event, this);
        }
      }
    });
    node.mouseup(function (evt) {
      self.currentNode = this;
      this.fixed = true;
      this.isDragging = false;
      this.dx = this.cx;
      this.dy = this.cy;
      if (evt.button == 2) {
        self.showNodeRightMenu(evt, this);
      }
      if (self.config.node.hasOwnProperty('onMouseUp')) {
        var onMouseUp = self.config.node['onMouseUp'];
        if (typeof onMouseUp === 'function') {
          onMouseUp(event, this);
        }
      }
    });
    node.mousedown(function (evt) {
      if (self.config.node.hasOwnProperty('onMouseDown')) {
        var onMouseDown = self.config.node['onMouseDown'];
        if (typeof onMouseDown === 'function') {
          onMouseDown(event, this);
        }
      }
    });
    node.mouseover(function (evt) {
      if (self.config.node.hasOwnProperty('onMouseOver')) {
        var onMouseOver = self.config.node['onMouseOver'];
        if (typeof onMouseOver === 'function') {
          onMouseOver(event, this);
        }
      }
    });
    node.mouseout(function (evt) {
      if (self.config.node.hasOwnProperty('onMouseOut')) {
        var onMouseOut = self.config.node['onMouseOut'];
        if (typeof onMouseOut === 'function') {
          onMouseOut(event, this);
        }
      }
    });
    return node;
  };
  VisualGraph.prototype.refresh = function () {
    var self = this;
    if (self.stage && self.stage.fps <= 0) {
      self.stage.fps = 25;
      setTimeout(function () {
        self.stage.fps = -25;
      }, 1000);
    }
  };
  VisualGraph.prototype.highLightNeiberNodes = function (_node, alpha) {
    var self = this;
    self.nodes.map(function (n) {
      n.t_alpha = n.alpha;
      n.alpha = alpha || 0.1;
    });
    _node.alpha = _node.t_alpha;
    (_node.inLinks || []).map(function (link) {
      if (link.source.visible) {
        link.source.alpha = link.source.t_alpha;
      }
    });
    (_node.outLinks || []).map(function (link) {
      if (link.target.visible) {
        link.target.alpha = link.target.t_alpha;
      }
    });
    if (self.showLinkFlag) {
      self.links.map(function (link) {
        link.visible = false;
      });
      (_node.inLinks || []).map(function (link) {
        if (link.source.visible) {
          link.visible = true;
        }
      });
      (_node.outLinks || []).map(function (link) {
        if (link.target.visible) {
          link.visible = true;
        }
      });
    }
  };
  VisualGraph.prototype.restoreHightLight = function () {
    var self = this;
    self.nodes.map(function (n) {
      n.alpha = n.t_alpha || n.alpha;
    });
    if (self.showLinkFlag) {
      self.links.map(function (link) {
        if (link.source.visible && link.target.visible) {
          link.visible = true;
        }
      });
    }
  };
  VisualGraph.prototype.lockNode = function (node) {
    if (node && node != null) {
      node.fixed = true;
      node.dragable = false;
    }
  };
  VisualGraph.prototype.unLockNode = function (node) {
    if (node && node != null) {
      node.fixed = false;
      node.dragable = true;
    }
  };
  VisualGraph.prototype.showNodeRightMenu = function (event, _node) {
    var self = this;
    if (self.config.hasOwnProperty('rightMenu')) {
      if (self.config['rightMenu'].hasOwnProperty('nodeMenu')) {
        var nodeShow = self.config['rightMenu']['nodeMenu']['show'];
        if (typeof nodeShow === 'function') {
          self.config['rightMenu']['nodeMenu'].show(event, self, _node);
        }
      }
    }
  };
  VisualGraph.prototype.showLinkRightMenu = function (event, link) {
    var self = this;
    if (self.config.hasOwnProperty('rightMenu')) {
      if (self.config['rightMenu'].hasOwnProperty('linkMenu')) {
        var linkShow = self.config['rightMenu']['linkMenu']['show'];
        if (typeof linkShow === 'function') {
          self.config['rightMenu']['linkMenu'].show(event, self, link);
        }
      }
    }
  };
  VisualGraph.prototype.showClusterRightMenu = function (event, group) {
    var self = this;
    if (self.config.hasOwnProperty('rightMenu')) {
      if (self.config['rightMenu'].hasOwnProperty('groupMenu')) {
        var show = self.config['rightMenu']['groupMenu']['show'];
        if (typeof show === 'function') {
          self.config['rightMenu']['groupMenu'].show(event, self, group);
        }
      }
    }
  };
  VisualGraph.prototype.colorHex = function (hexColor) {
    var ctool = new DGraph.ColorUtils();
    return ctool.colorHex(hexColor) || '0,0,250';
  };
  VisualGraph.prototype.newEdge = function (source, target) {
    if (source == null || target == null) {
      return false;
    }
    var self = this;
    var link = new DGraph.Edge(source, target, null);
    link.lineWidth = self.config.link.lineWidth;
    link.alpha = self.config.link.alpha;
    link.strokeColor = self.config.link.color;
    link.showArrow = self.config.link.showArrow;
    link.arrowType = self.config.link.arrowType;
    link.lineType = self.config.link.lineType;
    link.lineDash = self.config.link.lineDash;
    link.fontColor = self.config.link.label.color;
    link.showShadow = self.config.link.selected.showShadow;
    link.shadowColor = self.config.link.selected.shadowColor;
    link.selectedColor = self.config.link.selected.color;
    link.selectedAlpha = self.config.link.selected.alpha;
    link.colorType = self.config.link.colorType;
    link.labelBackGround = self.config.link.label.background;
    link.labelBorderWidth = self.config.link.label.borderWidth;
    link.labelBorderColor = self.config.link.label.borderColor;
    link.distance = self.forceOptions.linkDistance;
    link.strength = self.forceOptions.linkStrength;
    link.weight = 1;
    ++source.weight;
    ++target.weight;
    link.mouseup(function (evt) {
      self.currentLink = this;
      if (evt.button == 2) {
        self.showLinkRightMenu(evt, this);
      }
    });
    link.click(function (event) {
      if (self.config.link.hasOwnProperty('onClick')) {
        var onClick = self.config.link['onClick'];
        if (typeof onClick === 'function') {
          onClick(event, this);
        }
      }
    });
    link.dbclick(function (event) {
      if (self.config.link.hasOwnProperty('ondblClick')) {
        var ondbClick = self.config.link['ondblClick'];
        if (typeof ondbClick === 'function') {
          ondbClick(event, this);
        }
      }
    });
    link.mouseover(function (event) {
      if (self.config.link.hasOwnProperty('onMouseOver')) {
        var onMouseOver = self.config.link['onMouseOver'];
        if (typeof onMouseOver === 'function') {
          onMouseOver(event, this);
        }
      }
    });
    link.mouseout(function (event) {
      if (self.config.link.hasOwnProperty('onMouseOut')) {
        var onMouseOut = self.config.link['onMouseOut'];
        if (typeof onMouseOut === 'function') {
          onMouseOut(event, this);
        }
      }
    });
    return link;
  };
  VisualGraph.prototype.addNode = function (_node) {
    var self = this;
    var node = self.newNode(_node);
    node.text = node.label;
    node.showlabel = true;
    self.scene.add(node);
    self.nodes.push(node);
    self.refresh();
    return node;
  };
  VisualGraph.prototype.addEdge = function (_link) {
    var self = this;
    var source = _link.source;
    var target = _link.target;
    var sourceNode = this.nodes.filter(function (n) {
      return n.id == source;
    })[0];
    var targetNode = this.nodes.filter(function (n) {
      return n.id == target;
    })[0];
    var link = null;
    if (sourceNode && targetNode) {
      link = self.newEdge(sourceNode, targetNode);
      link.id = _link.id || '';
      link.type = _link.type || 'default';
      link.label = _link.label || '';
      link.showlabel = _link.showlabel || self.config.link.label.show;
      link.lineWidth = Number(_link.lineWidth) || self.config.link.lineWidth;
      link.strokeColor = _link.color || self.config.link.color;
      link.weight = Number(_link.weight) || 1;
      link.lineType = _link.lineType || self.config.link.lineType;
      link.lineDash = _link.lineDash || self.config.link.lineDash;
      link.font = _link.font || self.config.link.label.font;
      link.fontColor = _link.fontColor || self.config.link.label.color;
      link.properties = _link.properties || {};
      self.scene.add(link);
      self.links.push(link);
      self.refresh();
    }
    return link;
  };
  VisualGraph.prototype.getGraphData = function () {
    var self = this;
    return { nodes: self.nodes, links: self.links };
  };
  VisualGraph.prototype.getVisibleData = function () {
    var self = this;
    var visibleNodes = self.nodes.filter(function (n) {
      return n.visible == true;
    });
    var visibleLinks = self.links.filter(function (l) {
      var source = l.source,
        target = l.target;
      return source.visible == true && target.visible == true;
    });
    visibleNodes.forEach((n) => {
      n.fixed = false;
    });
    return { nodes: visibleNodes, links: visibleLinks };
  };
  VisualGraph.prototype.setZoom = function (type) {
    var self = this;
    if (type == 'zoomOut') {
      self.stage.zoomOut();
    } else if (type == 'zoomIn') {
      self.stage.zoomIn();
    } else if (type == 'zoom1') {
      self.stage.centerAndZoom();
      self.scene.scaleX = 1;
      self.scene.scaleY = 1;
    } else {
      self.stage.centerAndZoom(1.0, 1.0);
    }
    self.refresh();
  };
  VisualGraph.prototype.moveCenter = function () {
    this.scene.scaleX = 1;
    this.scene.scaleY = 1;
    this.scene.translateToCenter();
    this.refresh();
  };
  VisualGraph.prototype.moveNodeToCenter = function (node, times) {
    var self = this;
    if (times && Number(times) > 0) {
      self.animate({
        targets: self.scene,
        translateX: -node.x + self.stage.canvas.width / 2,
        translateY: -node.y + self.stage.canvas.height / 2,
        duration: times || 800,
        easing: 'linear',
      });
    } else {
      self.scene.setCenter(node.x, node.y);
      self.refresh();
    }
  };
  VisualGraph.prototype.setLineType = function (type) {
    this.links.forEach(function (link) {
      link.lineType = type;
    });
    this.refresh();
  };
  VisualGraph.prototype.setNodeShape = function (type) {
    this.nodes.forEach(function (node) {
      if (node.shape == 'circle') {
        node.height = node.width;
      }
      node.shape = type;
    });
    this.refresh();
  };
  VisualGraph.prototype.showNodeLabel = function (flag) {
    this.nodes.forEach(function (node) {
      node.showlabel = flag;
    });
    this.refresh();
  };
  VisualGraph.prototype.showLinkLabel = function (flag) {
    this.links.forEach(function (link) {
      link.showlabel = flag;
    });
    this.refresh();
  };
  VisualGraph.prototype.resize = function () {
    this.stage.resize();
  };
  VisualGraph.prototype.setMouseModel = function (model) {
    if (model == 'drag') {
      this.stage.mode = 'drag';
    } else if (model == 'select') {
      this.stage.mode = 'select';
    } else {
      this.stage.mode = 'normal';
    }
  };
  VisualGraph.prototype.contract = function (curNode) {
    var _self = this;
    if (curNode) {
      var leafNodes = [];
      (curNode.outLinks || []).forEach(function (l) {
        if (
          (l.target.outLinks || []).length == 0 &&
          (l.target.inLinks || []).length == 1
        ) {
          leafNodes.push(l.target);
          l.visible = false;
        }
      });
      curNode.tipText = leafNodes.length;
      leafNodes.forEach(function (n) {
        n.visible = false;
      });
      _self.refresh();
    }
  };
  VisualGraph.prototype.expanded = function (curNode) {
    var _self = this;
    if (curNode) {
      var targetNodes = [];
      (curNode.outLinks || []).forEach(function (l) {
        var target = l.target;
        if ((target.outLinks || []).length == 0 && target.visible == false) {
          l.visible = true;
          target.visible = true;
          targetNodes.push(target);
        }
      });
      if (targetNodes.length == 0) {
        return;
      }
      curNode.tipText = null;
    }
  };
  VisualGraph.prototype.saveImage = function (width, height, type, fileName) {
    this.stage.saveAsLocalImage(width, height, type, fileName);
  };
  VisualGraph.prototype.exportJsonFile = function (fileName) {
    var jsonStr = JSON.stringify(this.serialized());
    funDownload(jsonStr, fileName || 'graphvis' + '.json');
    function funDownload(content, filename) {
      var eleLink = document.createElement('a');
      eleLink.download = filename;
      eleLink.style.display = 'none';
      var blob = new Blob([content]);
      eleLink.href = URL.createObjectURL(blob);
      document.body.appendChild(eleLink);
      eleLink.click();
      document.body.removeChild(eleLink);
    }
  };
  VisualGraph.prototype.showOverView = function (flag) {
    if (flag) {
      this.stage.thumbnail.show();
    } else {
      this.stage.thumbnail.destory();
    }
  };
  VisualGraph.prototype.findNode = function (nodeLabel) {
    var nodes = this.nodes.filter(function (n) {
      if (n.label == null) return false;
      var label = n.label + '';
      return label == nodeLabel || n.id == nodeLabel;
    });
    if (nodes.length > 0) {
      var node = nodes[0];
      node.selected = true;
      node.showlabel = true;
      this.currentNode = node;
      this.focusTargetEle(node);
      return node;
    }
    return null;
  };
  VisualGraph.prototype.focusTargetEle = function (ele, params, callback) {
    ele.selected = true;
    if (!params) {
      params = {};
    }
    if (!params.x && params.x != 0) {
      params.x = this.stage.canvas.width / 2;
    }
    if (!params.y && params.y != 0) {
      params.y = this.stage.canvas.height / 2;
    }
    var self = this;
    self.animate({
      targets: self.scene,
      translateX: -ele.x + params.x,
      translateY: -ele.y + params.y,
      duration: 1000,
      easing: 'easeInOutQuad',
      complete: function (anim) {
        callback && callback();
      },
    });
  };
  VisualGraph.prototype.converHexToRGB = function (hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return (
        parseInt(result[1], 16) +
        ',' +
        parseInt(result[2], 16) +
        ',' +
        parseInt(result[3], 16)
      );
    }
    return '150,150,200';
  };
  VisualGraph.prototype.setLabelColor = function (hexColor) {
    var rgbColor = this.converHexToRGB(hexColor);
    this.config.node.label.color = rgbColor;
    this.nodes.forEach(function (node) {
      node.fontColor = rgbColor;
    });
    this.refresh();
  };
  VisualGraph.prototype.hideAllLink = function () {
    this.showLinkFlag = false;
    this.links.forEach(function (link) {
      link.visible = false;
    });
    this.refresh();
  };
  VisualGraph.prototype.showAllLink = function () {
    this.showLinkFlag = true;
    this.links.forEach(function (link) {
      if (link.source.visible && link.target.visible) {
        link.visible = true;
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.showAllNode = function () {
    this.nodes.forEach(function (node) {
      node.alpha = 1;
      node.visible = true;
    });
    this.refresh();
  };
  VisualGraph.prototype.setNodeFont = function (fontSize) {
    var self = this;
    self.nodes.forEach(function (n) {
      n.font = 'noraml ' + fontSize + 'px Arial';
    });
    self.refresh();
  };
  VisualGraph.prototype.setTextPosition = function (textAlign) {
    var self = this;
    self.nodes.forEach(function (n) {
      n.textPosition = textAlign;
    });
    self.refresh();
  };
  VisualGraph.prototype.setLinkAlpha = function (alpha) {
    this.links.forEach(function (links) {
      links.alpha = alpha;
    });
    this.refresh();
  };
  VisualGraph.prototype.setLinkArrowShow = function (flag) {
    this.links.forEach(function (l) {
      l.showArrow = flag;
    });
    this.refresh();
  };
  VisualGraph.prototype.setLinkColor = function (hexColor) {
    var rgbColor = this.converHexToRGB(hexColor);
    this.links.forEach(function (link) {
      link.colorType = 'defined';
      link.strokeColor = rgbColor;
    });
    this.refresh();
  };
  VisualGraph.prototype.setLinkColorType = function (type) {
    var linkColorType = type || 'source';
    this.links.forEach(function (l) {
      l.colorType = linkColorType;
      if (linkColorType == 'defined') {
        l.strokeColor = self.config.link.color || '50,50,50';
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.setLinkFont = function (fontSize) {
    var self = this;
    self.links.forEach(function (l) {
      l.font = 'noraml ' + fontSize + 'px Arial';
      l.textOffsetX = -Number(fontSize);
    });
    this.refresh();
  };
  VisualGraph.prototype.setLinkLabelColor = function (hexColor) {
    var self = this;
    var rgbColor = this.converHexToRGB(hexColor);
    self.links.forEach(function (l) {
      l.fontColor = rgbColor;
    });
    this.refresh();
  };
  VisualGraph.prototype.resetNodeInfo = function (nodeInfo) {
    var node = this.currentNode;
    if (node) {
      node.label = this.currentNode.text = nodeInfo.name;
      node.width = Number(nodeInfo.width) || Number(nodeInfo.size) || 60;
      node.height = Number(nodeInfo.height) || Number(nodeInfo.size) || 60;
      node.scaleX = node.scaleY = Number(nodeInfo.scale) || 1;
      node.fillColor = this.converHexToRGB(nodeInfo.fillColor);
      node.shape = nodeInfo.shape;
      node.showlabel = nodeInfo.showlabel == 'true' ? true : false;
      node.imageUrl = nodeInfo.image;
      node.setImage(nodeInfo.image);
      this.refresh();
    }
  };
  VisualGraph.prototype.resetEdgeStyle = function (lineInfo) {
    var self = this;
    var line = self.currentLink;
    if (line) {
      line.label = lineInfo['label'];
      line.text = line.label;
      line.type = line.label;
      line.lineWidth = lineInfo['lineWidth'];
      line.lineType = lineInfo['lineType'];
      if (lineInfo['lineDash']) {
        line.lineDash = lineInfo['lineDash'].split(',');
      }
      var color = lineInfo['edgeColor'];
      if (color && color.length > 0) {
        line.strokeColor = self.converHexToRGB(color);
        line.fontColor = line.strokeColor;
        line.colorType = 'defined';
      }
      line.showlabel = true;
      this.refresh();
    }
  };
  VisualGraph.prototype.addClusterContainer = function (
    clusters,
    avoidOverlap
  ) {
    var self = this;
    if (clusters == null) {
      return;
    }
    if (avoidOverlap == undefined || avoidOverlap == null) {
      avoidOverlap = false;
    }
    self.clusterGroups.forEach(function (group) {
      self.scene.remove(group);
    });
    self.clusterGroups = [];
    for (var clusterKey in clusters) {
      var cluster = clusters[clusterKey];
      var clusterNodes = self.nodes.filter(function (node) {
        return node.cluster == clusterKey;
      });
      var size = cluster.size,
        rate = cluster.rate,
        color = cluster.color;
      if (clusterNodes.length > 1) {
        var group = new DGraph.Group();
        group.headerColor = color;
        group.fillColor = color;
        group.alpha = 0.3;
        group.label = clusterKey;
        group.mouseup(function (evt) {
          if (evt.button == 2) {
            self.currentCluster = this;
            self.showClusterRightMenu(evt, this);
          }
        });
        self.scene.add(group);
        self.clusterGroups.push(group);
        clusterNodes.forEach(function (node) {
          group.add(node);
        });
        this.refresh();
      }
    }
    if (!avoidOverlap) {
      self.clusterAvoidOverlap(self.clusterGroups);
      this.refresh();
    }
  };
  VisualGraph.prototype.removeCluster = function () {
    var self = this;
    self.clusterGroups = self.clusterGroups.filter(function (clusterGroup) {
      return clusterGroup != self.currentCluster;
    });
    self.scene.remove(self.currentCluster);
    this.refresh();
  };
  VisualGraph.prototype.clearClusters = function () {
    var self = this;
    self.clusterGroups.forEach(function (clusterGroup) {
      self.scene.remove(clusterGroup);
    });
    self.clusterGroups = [];
    this.refresh();
  };
  VisualGraph.prototype.clusterAvoidOverlap = function (clusterGroups) {
    var self = this;
    var virtualNodes = [];
    clusterGroups.forEach(function (group, i) {
      group.ajustSize();
      var groupRadius = Math.sqrt(
        (group.width / 2) * (group.width / 2) +
          (group.height / 2) * (group.height / 2)
      );
      var tempNode = new DGraph.Node();
      tempNode.radius = groupRadius;
      tempNode.x = group.cx;
      tempNode.y = group.cy;
      virtualNodes[i] = tempNode;
    });
    if (typeof LayoutFactory != 'undefined') {
      var layout = new LayoutFactory({
        nodes: virtualNodes,
        links: null,
      }).createLayout('noverlap');
      if (layout != null) {
        layout.initAlgo();
        layout.resetConfig({ maxMove: 1 });
        var times = 0,
          runFlag = true;
        while (times++ < 300 && runFlag) {
          layout.runLayout();
          runFlag = layout.runFlag;
        }
      }
    }
    virtualNodes.forEach(function (node, i) {
      var group = clusterGroups[i];
      var dx = node.x - group.cx,
        dy = node.y - group.cy;
      group.childs.forEach(function (childNode) {
        childNode.x += dx;
        childNode.y += dy;
      });
    });
  };
  VisualGraph.prototype.applyNodeSize = function (range) {
    var self = this;
    var minDegree = 0;
    var maxDegree = 0;
    self.nodes.forEach(function (n) {
      var degree = (n.outLinks || []).length + (n.inLinks || []).length;
      n.degree = degree;
      minDegree = Math.min(degree, minDegree);
      maxDegree = Math.max(degree, maxDegree);
    });
    var degreesDomain = [Math.sqrt(minDegree), Math.sqrt(maxDegree)];
    self.nodes.forEach(function (n) {
      var scale = self.numScale(range, degreesDomain, Math.sqrt(n.degree));
      n.scaleX = scale;
      n.scaleY = scale;
    });
    this.refresh();
  };
  VisualGraph.prototype.applyLinkWeight = function (range) {
    var self = this;
    var minWeight = 3;
    var maxWeight = 8;
    self.links.forEach(function (l) {
      minWeight = Math.min(l.weight, minWeight);
      maxWeight = Math.max(l.weight, maxWeight);
    });
    var weightDomain = [Math.sqrt(minWeight), Math.sqrt(maxWeight)];
    self.links.forEach(function (l) {
      var lineWidth = self.numScale(range, weightDomain, Math.sqrt(l.weight));
      l.lineWidth = Math.round(lineWidth);
    });
    this.refresh();
  };
  VisualGraph.prototype.numScale = function (range, domain, num) {
    return (
      ((num - domain[0]) * (range[1] - range[0])) / (domain[1] - domain[0]) +
      range[0]
    ).toFixed(1);
  };
  VisualGraph.prototype.selectAll = function () {
    var _self = this;
    this.nodes.forEach(function (n) {
      n.selected = true;
      _self.scene.addToSelected(n);
    });
    this.refresh();
  };
  VisualGraph.prototype.reverseSelect = function () {
    var _self = this;
    this.nodes.forEach(function (n) {
      if (n.selected) {
        n.selected = false;
        _self.scene.removeFromSelected(n);
      } else {
        n.selected = true;
        _self.scene.addToSelected(n);
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.selectRelate = function (node) {
    var self = this;
    var _node = node || self.currentNode;
    if (_node == null) {
      return false;
    }
    var inLinks = _node.inLinks || [];
    var outLinks = _node.outLinks || [];
    inLinks.forEach(function (link) {
      link.source.selected = true;
      self.scene.addToSelected(link.source);
    });
    outLinks.forEach(function (link) {
      link.target.selected = true;
      self.scene.addToSelected(link.target);
    });
    this.refresh();
  };
  VisualGraph.prototype.showSelected = function () {
    this.nodes.forEach(function (n) {
      if (!n.selected) {
        n.visible = false;
        var inLinks = n.inLinks || [],
          outLinks = n.outLinks || [];
        inLinks.forEach(function (l) {
          l.visible = false;
        });
        outLinks.forEach(function (l) {
          l.visible = false;
        });
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.setScale = function (node, scale) {
    if (node) {
      node.scaleX = scale;
      node.scaleY = scale;
      this.refresh();
    }
  };
  VisualGraph.prototype.hideSelected = function () {
    this.nodes.forEach(function (n) {
      if (n.selected) {
        n.visible = false;
        var inLinks = n.inLinks || [],
          outLinks = n.outLinks || [];
        inLinks.forEach(function (l) {
          l.visible = false;
        });
        outLinks.forEach(function (l) {
          l.visible = false;
        });
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.hideIsolatedNodes = function () {
    this.nodes.forEach(function (n) {
      if ((n.inLinks || []).length == 0 && (n.outLinks || []).length == 0) {
        n.visible = false;
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.showNodes = function () {
    this.nodes.forEach(function (n) {
      n.visible = true;
      n.alpha = 1;
    });
    this.refresh();
  };
  VisualGraph.prototype.deleteNode = function (node) {
    var _self = this;
    if (node) {
      var links = [];
      var index = _self.nodes.indexOf(node);
      if (index > -1) {
        (node.inLinks || []).forEach(function (l) {
          links.push(l);
        });
        (node.outLinks || []).forEach(function (l) {
          links.push(l);
        });
        _self.nodes.splice(index, 1);
        _self.scene.remove(node);
      }
      links.forEach(function (l) {
        index = _self.links.indexOf(l);
        if (index > -1) {
          _self.links.splice(index, 1);
          _self.scene.remove(l);
        }
      });
      node = null;
      this.refresh();
    }
  };
  VisualGraph.prototype.deleteLink = function (link) {
    var _self = this;
    if (link) {
      var index = _self.links.indexOf(link);
      if (index > -1) {
        _self.links.splice(index, 1);
        _self.scene.remove(link);
      }
      this.refresh();
    }
  };
  VisualGraph.prototype.setNodeLabelWithDegree = function (degree) {
    this.nodes.forEach(function (n) {
      if ((n.inLinks || []).length + (n.outLinks || []).length >= degree) {
        n.showlabel = true;
      } else {
        n.showlabel = false;
        n.text = null;
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.translateOrZoom = function (type) {
    var self = this;
    if (type === 'zoomOut') {
      scaleGraph(1.1);
    } else if (type === 'zoomIn') {
      scaleGraph(0.9);
    } else {
      this.stage.centerAndZoom(1.0, 1.0);
    }
    this.refresh();
    function scaleGraph(scale) {
      var nodeCount = self.nodes.length;
      var xMean = 0,
        yMean = 0;
      self.nodes.forEach(function (n) {
        xMean += n.x;
        yMean += n.y;
      });
      xMean /= nodeCount;
      yMean /= nodeCount;
      self.nodes.forEach(function (n) {
        var dx = (n.x - xMean) * scale;
        var dy = (n.y - yMean) * scale;
        n.x = xMean + dx;
        n.y = yMean + dy;
      });
    }
  };
  VisualGraph.prototype.rotateGraph = function (angle) {
    var self = this;
    var sin = Math.sin((-angle * Math.PI) / 180);
    var cos = Math.cos((-angle * Math.PI) / 180);
    var bounds = this.stage.getBound();
    var px = Math.round(bounds.width / 2);
    var py = Math.round(bounds.height / 2);
    this.nodes.forEach(function (n) {
      var dx = n.x - px;
      var dy = n.y - py;
      n.x = px + dx * cos - dy * sin;
      n.y = py + dy * cos + dx * sin;
    });
    this.refresh();
  };
  VisualGraph.prototype.getGraphStatistic = function () {
    var self = this;
    if (self.nodes.length == 0) {
      return null;
    }
    var density = self.calculateDensity();
    var avgDegree = self.calculateAvgDegree();
    var avgWeightDegree = self.calculateAvgWieghtDegree();
    return {
      nodesCount: self.nodes.length,
      linksCount: self.links.length,
      density: density.toFixed(6),
      avgDegree: avgDegree.toFixed(6),
      avgWeightDegree: avgWeightDegree.toFixed(6),
    };
  };
  VisualGraph.prototype.calculateDensity = function () {
    var self = this;
    var nodesCount = self.nodes.length,
      linksCount = self.links.length;
    var multiplier = 1;
    if (!self.isDerictedGraph) {
      multiplier = 2;
    }
    var density =
      (multiplier * linksCount) / (nodesCount * nodesCount - nodesCount);
    return density;
  };
  VisualGraph.prototype.calculateAvgDegree = function () {
    var self = this;
    var nodesCount = self.nodes.length,
      averageDegree = 0;
    self.nodes.forEach(function (n) {
      averageDegree += (n.inLinks || []).length + (n.outLinks || []).length;
    });
    var multiplier = 1;
    if (self.isDerictedGraph) {
      multiplier = 2;
    }
    var avgDegree = (averageDegree /= multiplier * nodesCount);
    return avgDegree;
  };
  VisualGraph.prototype.calculateAvgWieghtDegree = function () {
    var self = this;
    var nodesCount = self.nodes.length,
      averageWeightDegree = 0;
    self.nodes.forEach(function (n) {
      if (self.isDerictedGraph) {
        (n.inLinks || []).forEach(function (l) {
          averageWeightDegree += l.weight;
        });
        (n.outLinks || []).forEach(function (l) {
          averageWeightDegree += l.weight;
        });
      } else {
        var allLinks = [];
        allLinks.push(n.inLinks || []);
        allLinks.push(n.outLinks || []);
        allLinks.forEach(function (l) {
          var multi = 1;
          if (l.source == l.target) {
            multi = 2;
          }
          averageWeightDegree += multi * l.weight;
        });
      }
    });
    var multiplier = 1;
    if (self.isDerictedGraph) {
      multiplier = 2;
    }
    var avgDegree = (averageWeightDegree /= multiplier * nodesCount);
    return avgDegree;
  };
  VisualGraph.prototype.centrality = function () {
    var forEachLinkedNode = function (graph, nodeId, callback, oriented) {
      var node = graph.nodes.filter((node) => {
          return node.id === nodeId;
        })[0],
        i,
        link,
        linkedNodeId;
      var links = (node.outLinks || []).concat(node.intLinks || []);
      if (links && typeof callback === 'function') {
        if (oriented) {
          for (i = 0; i < links.length; ++i) {
            link = links[i];
            if (link.source.id === nodeId) {
              callback(
                graph.nodes.filter((_node) => {
                  return _node.id === link.target.id;
                })[0],
                link
              );
            }
          }
        } else {
          for (i = 0; i < links.length; ++i) {
            link = links[i];
            linkedNodeId =
              link.source.id === nodeId ? link.target.id : link.source.id;
            callback(
              graph.nodes.filter((_node) => {
                return _node.id === linkedNodeId;
              })[0],
              link
            );
          }
        }
      }
    };
    var singleSourceShortestPath = function (graph, node, oriented) {
        var P = {},
          S = [],
          sigma = {},
          d = {},
          Q = [node.id];
        graph.nodes.forEach(function (t) {
          P[t.id] = [];
          sigma[t.id] = 0;
        });
        d[node.id] = 0;
        sigma[node.id] = 1;
        while (Q.length) {
          var v = Q.shift(),
            dV = d[v],
            sigmaV = sigma[v];
          S.push(v);
          forEachLinkedNode(
            graph,
            v,
            function (w) {
              if (!d.hasOwnProperty(w.id)) {
                Q.push(w.id);
                d[w.id] = dV + 1;
              }
              if (d[w.id] === dV + 1) {
                sigma[w.id] += sigmaV;
                P[w.id].push(v);
              }
            },
            oriented
          );
        }
        return { S: S, P: P, sigma: sigma };
      },
      accumulate = function (betweenness, shortestPath, s) {
        var delta = {},
          S = shortestPath.S;
        for (var i = 0; i < S.length; ++i) {
          delta[S[i]] = 0;
        }
        while (S.length) {
          var w = S.pop(),
            coeff = (1 + delta[w]) / shortestPath.sigma[w],
            pW = shortestPath.P[w];
          for (i = 0; i < pW.length; ++i) {
            var v = pW[i];
            delta[v] += shortestPath.sigma[v] * coeff;
          }
          if (w !== s) {
            betweenness[w] += delta[w];
          }
        }
      },
      sortBetweennes = function (b) {
        var sorted = [];
        for (var key in b) {
          if (b.hasOwnProperty(key)) {
            sorted.push({ key: key, value: b[key] });
          }
        }
        return sorted.sort(function (x, y) {
          return y.value - x.value;
        });
      };
    return {
      betweennessCentrality: function (graph, oriented) {
        var betweennes = {};
        graph.nodes.forEach(function (node) {
          betweennes[node.id] = 0;
        });
        graph.nodes.forEach(function (node) {
          var shortestPath = singleSourceShortestPath(graph, node);
          accumulate(betweennes, shortestPath, node);
        });
        return sortBetweennes(betweennes);
      },
      degreeCentrality: function (graph, kind) {
        var calcDegFunction;
        kind = (kind || 'both').toLowerCase();
        if (kind === 'in') {
          calcDegFunction = function (links, nodeId) {
            var total = 0;
            for (var i = 0; i < links.length; ++i) {
              total += links[i].target.id === nodeId ? 1 : 0;
            }
            return total;
          };
        } else if (kind === 'out') {
          calcDegFunction = function (links, nodeId) {
            var total = 0;
            for (var i = 0; i < links.length; ++i) {
              total += links[i].source.id === nodeId ? 1 : 0;
            }
            return total;
          };
        } else {
          calcDegFunction = function (links, nodeId) {
            return links.length;
          };
        }
        var sortedDegrees = [];
        graph.nodes.forEach((node) => {
          var links = (node.outLinks || []).concat(node.inLinks || []),
            nodeDeg = calcDegFunction(links, node.id);
          if (!sortedDegrees.hasOwnProperty(nodeDeg)) {
            sortedDegrees[nodeDeg] = [node.id];
          } else {
            sortedDegrees[nodeDeg].push(node.id);
          }
        });
        var result = [];
        for (var degree in sortedDegrees) {
          if (sortedDegrees.hasOwnProperty(degree)) {
            var nodes = sortedDegrees[degree];
            if (!nodes) {
              continue;
            }
            for (var j = 0; j < nodes.length; ++j) {
              result.unshift({ key: nodes[j], value: parseInt(degree, 10) });
            }
          }
        }
        return result;
      },
    };
  };
  VisualGraph.prototype.serialized = function () {
    var self = this;
    var _graph = { nodes: [], links: [] };
    self.nodes.forEach(function (n) {
      _graph.nodes.push({
        id: n.id,
        label: n.label,
        x: Math.round(n.x),
        y: Math.round(n.y),
        width: n.width,
        height: n.height,
        size: n.size,
        color: n.fillColor,
        shape: n.shape,
      });
    });
    self.links.forEach(function (l) {
      _graph.links.push({
        id: l.id,
        source: l.source.id,
        target: l.target.id,
        label: l.label || l.type || '',
        lineWidth: l.lineWidth,
        lineType: l.lineType,
        color: l.strokeColor,
      });
    });
    return _graph;
  };
  VisualGraph.prototype.nodeWrapText = function (flag) {
    this.nodes.forEach((node) => {
      node.wrapText = flag;
    });
    this.refresh();
  };
  VisualGraph.prototype.nodeMapAlphaByDegree = function () {
    var self = this;
    var minDegree = 0,
      maxDegree = 0;
    self.nodes.forEach(function (n) {
      n.outdegree = (n.outLinks || []).reduce(function (total, _link) {
        return total + (_link.weight || 1);
      }, 0);
      n.indegree = (n.inLinks || []).reduce(function (total, _link) {
        return total + (_link.weight || 1);
      }, 0);
      n.degree = n.outdegree + n.indegree;
      minDegree = Math.min(n.degree, minDegree);
      maxDegree = Math.max(n.degree, maxDegree);
    });
    var degreesDomain = [minDegree, maxDegree];
    var range = [0.2, 1];
    self.nodes.forEach(function (n) {
      var _alpha = self.numScale(range, degreesDomain, n.degree);
      n.alpha = _alpha;
      (n.outLinks || []).forEach(function (l) {
        l.alpha = _alpha;
      });
    });
    this.refresh();
  };
  VisualGraph.prototype.nodeMapSizeByDegree = function (propType, range) {
    var self = this;
    var minDegree = 0,
      maxDegree = 0;
    var degreeArr = {};
    self.nodes.forEach(function (n) {
      n.outdegree = (n.outLinks || []).reduce(function (total, _link) {
        return total + (_link.weight || 1);
      }, 0);
      n.indegree = (n.inLinks || []).reduce(function (total, _link) {
        return total + (_link.weight || 1);
      }, 0);
      n.degree = n.outdegree + n.indegree;
      if (propType == 'degree') {
        minDegree = Math.min(n.degree, minDegree);
        maxDegree = Math.max(n.degree, maxDegree);
      } else if (propType == 'outdegree') {
        minDegree = Math.min(n.outdegree, minDegree);
        maxDegree = Math.max(n.outdegree, maxDegree);
      } else {
        minDegree = Math.min(n.indegree, minDegree);
        maxDegree = Math.max(n.indegree, maxDegree);
      }
    });
    var degreesDomain = [minDegree, maxDegree];
    self.nodes.forEach(function (n) {
      var nodeSize = 1;
      if (propType == 'degree') {
        nodeSize = self.numScale(range, degreesDomain, n.degree);
      } else if (propType == 'outdegree') {
        nodeSize = self.numScale(range, degreesDomain, n.outdegree);
      } else {
        nodeSize = self.numScale(range, degreesDomain, n.indegree);
      }
      n.width = n.height = n.radius = Math.round(nodeSize);
    });
    this.refresh();
  };
  VisualGraph.prototype.findAllPath = function (
    startNode,
    endNode,
    isDirected
  ) {
    var self = this;
    if (!startNode || !endNode) {
      return null;
    }
    let allPathNodes = [];
    const findPath = (source, target, pathNodes = []) => {
      pathNodes = [...pathNodes];
      pathNodes.push(source);
      if (source === target) {
        allPathNodes.push(pathNodes);
        return;
      }
      const neighborNodes = [];
      (source.outLinks || []).forEach((link) => {
        neighborNodes.push(link.target);
      });
      if (!isDirected) {
        (source.inLinks || []).forEach((link) => {
          neighborNodes.push(link.source);
        });
      }
      for (let i = 0; i < neighborNodes.length; i++) {
        var node = neighborNodes[i];
        if (pathNodes.indexOf(node) == -1) {
          findPath(node, target, pathNodes);
        }
      }
    };
    findPath(startNode, endNode);
    allPathNodes.sort((path1, path2) => {
      return path1.length - path2.length;
    });
    let allPathLinks = [];
    allPathNodes.forEach((pathNodes) => {
      var paths = [];
      var length = pathNodes.length;
      for (var i = 0; i < length; i++) {
        var pathNode = pathNodes[i];
        (pathNode.outLinks || []).forEach((link) => {
          if (
            pathNodes.indexOf(link.target) != -1 &&
            pathNodes.indexOf(link.source) != -1 &&
            paths.indexOf(link) == -1
          ) {
            paths.push(link);
          }
        });
        (pathNode.inLinks || []).forEach((link) => {
          if (
            pathNodes.indexOf(link.target) != -1 &&
            pathNodes.indexOf(link.source) != -1 &&
            paths.indexOf(link) == -1
          ) {
            paths.push(link);
          }
        });
      }
      allPathLinks.push(paths);
    });
    return allPathLinks;
  };
  VisualGraph.prototype.findShortPath = function (
    sourceLabel,
    targetLabel,
    direction
  ) {
    var self = this;
    var startNode = self.nodes.filter(function (n) {
      return n.label == sourceLabel;
    })[0];
    var endNode = self.nodes.filter(function (n) {
      return n.label == targetLabel;
    })[0];
    let allPathLinks = [];
    if (direction == 'source') {
      allPathLinks = self.findAllPath(startNode, endNode, true);
    } else if (direction == 'target') {
      allPathLinks = self.findAllPath(endNode, startNode, true);
    } else {
      allPathLinks = self.findAllPath(endNode, startNode, false);
    }
    let path = allPathLinks.length > 0 ? allPathLinks[0] : [];
    path.forEach((link) => {
      link.selected = true;
      self.scene.addToSelected(link);
      link.target.selected = true;
      self.scene.addToSelected(link.target);
      link.source.selected = true;
      self.scene.addToSelected(link.source);
    });
    self.refresh();
    return path;
  };
  VisualGraph.prototype.pathAnalyze = function (
    sourceLabel,
    targetLabel,
    direction
  ) {
    var self = this;
    if (sourceLabel.length == 0 || targetLabel.length == 0) {
      return null;
    }
    var startNode = self.nodes.filter(function (n) {
      return n.label == sourceLabel;
    })[0];
    var endNode = self.nodes.filter(function (n) {
      return n.label == targetLabel;
    })[0];
    let allPathLinks = [];
    if (direction == 'source') {
      allPathLinks = self.findAllPath(startNode, endNode, true);
    } else if (direction == 'target') {
      allPathLinks = self.findAllPath(endNode, startNode, true);
    } else {
      allPathLinks = self.findAllPath(endNode, startNode, false);
    }
    (allPathLinks || []).forEach((path) => {
      path.forEach((link) => {
        link.selected = true;
        self.scene.addToSelected(link);
        link.target.selected = true;
        self.scene.addToSelected(link.target);
        link.source.selected = true;
        self.scene.addToSelected(link.source);
      });
    });
    self.refresh();
    return allPathLinks;
  };
  VisualGraph.prototype.checkAllCycle = function () {
    var self = this;
    var lgDegreeNodes = self.nodes.filter((node) => {
      return (
        (node.inLinks || []).length >= 1 && (node.outLinks || []).length >= 1
      );
    });
    if (!lgDegreeNodes) {
      return null;
    }
    let allCyclePath = [];
    var length = lgDegreeNodes.length;
    for (let i = 0; i < length; i++) {
      var startNode = lgDegreeNodes[i];
      var inLinks = startNode.inLinks;
      inLinks.forEach((link) => {
        var targetNode = link.source;
        if (lgDegreeNodes.indexOf(targetNode) != -1) {
          var allPathLinks = self.findAllPath(startNode, targetNode, true);
          if (allPathLinks && allPathLinks.length > 0) {
            allCyclePath = allCyclePath.concat(allPathLinks);
          }
        }
      });
    }
    let resultPath = [];
    allCyclePath.forEach((paths) => {
      paths.forEach((path) => {
        if (resultPath.indexOf(path) == -1) {
          resultPath.push(path);
        }
      });
    });
    resultPath.forEach((link) => {
      link.selected = true;
      self.scene.addToSelected(link);
      link.target.selected = true;
      self.scene.addToSelected(link.target);
      link.source.selected = true;
      self.scene.addToSelected(link.source);
    });
    self.refresh();
    return resultPath;
  };
  VisualGraph.prototype.findNodeCyclePath = function (node) {
    var self = this;
    if (!node) {
      return null;
    }
    let allCyclePath = [];
    var inLinks = node.inLinks || [];
    inLinks.forEach((link) => {
      var targetNode = link.source;
      var allPathLinks = self.findAllPath(node, targetNode, true);
      if (allPathLinks && allPathLinks.length > 0) {
        allCyclePath = allCyclePath.concat(allPathLinks);
      }
    });
    let resultPath = [];
    allCyclePath.forEach((paths) => {
      paths.forEach((path) => {
        if (resultPath.indexOf(path) == -1) {
          resultPath.push(path);
        }
      });
    });
    resultPath.forEach((link) => {
      link.selected = true;
      self.scene.addToSelected(link);
      link.target.selected = true;
      self.scene.addToSelected(link.target);
      link.source.selected = true;
      self.scene.addToSelected(link.source);
    });
    self.refresh();
    return resultPath;
  };
  VisualGraph.prototype.findClusters = function () {
    var _self = this;
    var nodeList = [];
    this.nodes.forEach(function (n) {
      if ((n.outLinks || []).length > 0) {
        n.selected = true;
        _self.scene.addToSelected(n);
        nodeList.push(n);
      }
    });
    this.refresh();
    return nodeList;
  };
  VisualGraph.prototype.findNDegreeRelates = function (degree) {
    var _self = this;
    var nodeList = [];
    this.nodes.forEach(function (n) {
      var total = (n.inLinks || []).length + (n.outLinks || []).length;
      if (total >= degree) {
        n.selected = true;
        _self.scene.addToSelected(n);
        nodeList.push(n);
      }
    });
    this.refresh();
    return nodeList;
  };
  VisualGraph.prototype.nLayerRelates = function (nodeLabel, layerNum) {
    var _self = this;
    var currentNode = _self.nodes.filter(function (n) {
      return n.label == nodeLabel;
    })[0];
    var middleNode = [];
    var nowOutsideNode = {};
    var nodeList = [];
    if (null != currentNode) {
      currentNode.selected = true;
      _self.scene.addToSelected(currentNode);
      nodeList.push(currentNode);
      recursive(currentNode, layerNum);
      _self.refresh();
    }
    function recursive(node, nLayer) {
      if (nLayer > 1) {
        if (layerNum == nLayer && middleNode.indexOf(node) == -1) {
          middleNode.push(node);
        }
        var level = layerNum - nLayer;
        var inLinks = node.inLinks || [];
        var outLinks = node.outLinks || [];
        inLinks.forEach(function (l) {
          if (middleNode.indexOf(l.source) == -1) {
            middleNode.push(l.source);
            if (nowOutsideNode[level] == undefined) {
              nowOutsideNode[level] = [];
            }
            nowOutsideNode[level].push(l.source);
          }
        });
        outLinks.forEach(function (l) {
          if (middleNode.indexOf(l.target) == -1) {
            middleNode.push(l.target);
            if (nowOutsideNode[level] == undefined) {
              nowOutsideNode[level] = [];
            }
            nowOutsideNode[level].push(l.target);
          }
        });
        if (nowOutsideNode[level] == undefined) {
          return;
        }
        nowOutsideNode[level].forEach(function (l) {
          recursive(l, nLayer - 1);
        });
      } else if (nLayer == 1) {
        var inLinks = node.inLinks || [];
        var outLinks = node.outLinks || [];
        inLinks.forEach(function (l) {
          if (middleNode.indexOf(l.source) == -1) {
            l.source.selected = true;
            _self.scene.addToSelected(l.source);
            nodeList.push(l.source);
          }
        });
        outLinks.forEach(function (l) {
          if (middleNode.indexOf(l.target) == -1) {
            l.target.selected = true;
            _self.scene.addToSelected(l.target);
            nodeList.push(l.target);
          }
        });
      }
    }
    return nodeList;
  };
  VisualGraph.prototype.getALLLineTypeCounter = function () {
    var self = this;
    var relationTypeMap = new Map();
    (self.links || []).forEach(function (link) {
      var typeValue = relationTypeMap.get(link.type);
      if (typeValue == null) {
        relationTypeMap.set(link.type, { label: link.label, num: 1 });
      } else {
        typeValue.num++;
      }
    });
    return relationTypeMap;
  };
  VisualGraph.prototype.removeCurrentLink = function () {
    this.scene.remove(this.currentLink);
    this.currentLink = null;
    this.refresh();
  };
  VisualGraph.prototype.filterNodes = function (type, condition, value) {
    this.nodes.forEach(function (n) {
      var degree = 0;
      if (type == 'degree') {
        degree = (n.inLinks || []).length + (n.outLinks || []).length;
      } else if (type == 'outdegree') {
        degree = (n.outLinks || []).length;
      } else if (type == 'indegree') {
        degree = (n.inLinks || []).length;
      }
      if (condition == 1) {
        if (degree > value) {
          n.visible = true;
        } else {
          n.visible = false;
        }
      } else if (condition == 2) {
        if (degree == value) {
          n.visible = true;
        } else {
          n.visible = false;
        }
      } else if (condition == 3) {
        if (degree < value) {
          n.visible = true;
        } else {
          n.visible = false;
        }
      }
    });
    this.links.forEach(function (l) {
      if (l.source.visible == false || l.target.visible == false) {
        l.visible = false;
      } else {
        l.visible = true;
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.filterLinks = function (condition, value) {
    this.links.forEach(function (l) {
      if (l.source.visible == true && l.target.visible == true) {
        if (condition == 1) {
          if (l.weight > value) {
            l.visible = true;
          } else {
            l.visible = false;
          }
        } else if (condition == 2) {
          if (l.weight == value) {
            l.visible = true;
          } else {
            l.visible = false;
          }
        } else if (condition == 3) {
          if (l.weight < value) {
            l.visible = true;
          } else {
            l.visible = false;
          }
        }
      } else {
        l.visible = false;
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.getTypeMap = function () {};
  VisualGraph.prototype.nodeMapColorsByDegree = function (propType, colorArr) {
    var self = this;
    var degreeArr = {};
    self.nodes.forEach(function (n) {
      n.outdegree = (n.outLinks || []).length;
      n.indegree = (n.inLinks || []).length;
      n.degree = n.outdegree + n.indegree;
      if (propType == 'degree') {
        degreeArr[n.degree + ''] = 1;
      } else if (propType == 'outdegree') {
        degreeArr[n.outdegree + ''] = 1;
      } else {
        degreeArr[n.indegree + ''] = 1;
      }
    });
    var degrees = [];
    for (var d in degreeArr) {
      degrees.push(d);
    }
    degrees.sort(function (d1, d2) {
      return Number(d1) > Number(d2) ? 1 : -1;
    });
    var ctool = new DGraph.ColorUtils();
    var colors = ctool.generateGradientColor(
      colorArr[0],
      colorArr[1],
      degrees.length
    );
    self.nodes.forEach(function (n) {
      var position = 0;
      if (propType == 'degree') {
        position = degrees.indexOf(n.degree + '');
      } else if (propType == 'outdegree') {
        position = degrees.indexOf(n.outdegree + '');
      } else {
        position = degrees.indexOf(n.indegree + '');
      }
      n.fillColor = colors[position].replace('rgb(', '').replace(')', '');
    });
    this.refresh();
  };
  VisualGraph.prototype.setLineDirected = function (isDirect) {
    this.links.forEach(function (l) {
      l.showArrow = isDirect;
    });
    this.refresh();
  };
  VisualGraph.prototype.setLineDashed = function (isDashed) {
    var self = this;
    var dashed = [0];
    if (isDashed) {
      dashed = [8, 5];
    }
    this.links.forEach(function (l) {
      l.lineDash = dashed;
    });
    this.refresh();
  };
  VisualGraph.prototype.setNodeSize = function (nodeSize) {
    nodeSize = Number(nodeSize) || 60;
    this.config.node.size = nodeSize;
    this.nodes.forEach(function (node) {
      node.width = node.height = Math.round(nodeSize);
    });
    this.refresh();
  };
  VisualGraph.prototype.setNodeColor = function (hexColor) {
    var rgbColor = this.converHexToRGB(hexColor);
    this.defaultNodeColor = rgbColor;
    this.nodes.forEach(function (node) {
      node.fillColor = rgbColor;
    });
    this.refresh();
  };
  VisualGraph.prototype.covertSencePoint = function (event) {
    return DGraph.util.getEventPosition(event);
  };
  VisualGraph.prototype.getMouseDownPosition = function () {
    var self = this;
    return { x: self.scene.mouseDownX, y: self.scene.mouseDownY };
  };
  VisualGraph.prototype.getPagePosition = function (x, y) {
    if (arguments.length != 2) {
      return { pageX: 0, pageY: 0 };
    }
    return this.stage.getPagePosition(x, y);
  };
  VisualGraph.prototype.addNodeForDrag = function (_node, callback) {
    var self = this;
    self.stage.removeEventListener('mousemove');
    self.stage.mousemove(function (event) {
      var p = self.scene.toSceneEvent(event);
      self.stage.removeEventListener('mousemove');
      _node.id = _node.id == null ? self.nodeIdIndex++ : _node.id;
      _node.x = p.x;
      _node.y = p.y;
      var node = self.newNode(_node);
      node.fixed = true;
      self.nodes.push(node);
      self.scene.add(node);
      self.refresh();
      if (callback && typeof callback === 'function') {
        callback(node);
      }
    });
  };
  VisualGraph.prototype.showAll = function () {
    this.nodes.forEach(function (n) {
      if (!n.visible) {
        n.visible = true;
      }
    });
    this.links.forEach(function (l) {
      if (!l.visible) {
        l.visible = true;
      }
    });
    this.refresh();
  };
  VisualGraph.prototype.filterChangeVisible = function (
    entityFalse,
    linkFalse,
    infoFilterParams
  ) {
    var _self = this;
    _self.showAll();
    if (entityFalse.length > 0) {
      _self.nodes.forEach(function (n) {
        if (n.type && entityFalse.indexOf(n.type) != -1) {
          n.visible = false;
        }
      });
    }
    if (linkFalse.length > 0) {
      _self.links.forEach(function (l) {
        if (l.label && linkFalse.indexOf(l.label) != -1) {
          l.visible = false;
        }
      });
    }
    if (infoFilterParams['linkCount']) {
      var _compare = infoFilterParams['linkCount'][0];
      var _input = infoFilterParams['linkCount'][1];
      _self.nodes.forEach(function (n) {
        var degree = (n.inLinks || []).length + (n.outLinks || []).length;
        if (!showOrHide(_compare, _input, degree)) {
          n.visible = false;
        }
      });
    }
    if (infoFilterParams['linkOut']) {
      var _compare = infoFilterParams['linkOut'][0];
      var _input = infoFilterParams['linkOut'][1];
      _self.nodes.forEach(function (n) {
        var degree = (n.outLinks || []).length;
        if (!showOrHide(_compare, _input, degree)) {
          n.visible = false;
        }
      });
    }
    if (infoFilterParams['linkIn']) {
      var _compare = infoFilterParams['linkIn'][0];
      var _input = infoFilterParams['linkIn'][1];
      _self.nodes.forEach(function (n) {
        var degree = (n.inLinks || []).length;
        if (!showOrHide(_compare, _input, degree)) {
          n.visible = false;
        }
      });
    }
    if (infoFilterParams['linkWeight']) {
      var _compare = infoFilterParams['linkWeight'][0];
      var _input = infoFilterParams['linkWeight'][1];
      _self.links.forEach(function (l) {
        if (!showOrHide(_compare, _input, l.weight)) {
          l.visible = false;
        }
      });
    }
    if (infoFilterParams['entityDesc']) {
      var _compare = infoFilterParams['entityDesc'][0];
      var _input = infoFilterParams['entityDesc'][1];
      _self.nodes.forEach(function (n) {
        var nodeValue = n.label;
        if (_compare == 1) {
          if (nodeValue != _input) {
            n.visible = false;
          }
        } else if (_compare == 2) {
          if (nodeValue.indexOf(_input) == -1) {
            n.visible = false;
          }
        }
      });
    }
    _self.links.forEach(function (l) {
      if (!l.source.visible || !l.target.visible) {
        l.visible = false;
      }
    });
    _self.refresh();
    function showOrHide(_compareType, compareValue, _degree) {
      if (_compareType == 1) {
        if (_degree > compareValue) {
          return true;
        }
        return false;
      } else if (_compareType == 2) {
        if (_degree == compareValue) {
          return true;
        }
        return false;
      } else {
        if (_degree < compareValue) {
          return true;
        }
        return false;
      }
      return true;
    }
  };
  VisualGraph.prototype.delSelect = function () {
    var _self = this;
    var selectNodes = _self.nodes.filter((n) => {
      return n.selected;
    });
    selectNodes.forEach((n) => {
      _self.removeOneNode(n);
    });
  };
  VisualGraph.prototype.removeOneNode = function (node) {
    var _self = this;
    if (node) {
      var links = [];
      var index = _self.nodes.indexOf(node);
      if (index > -1) {
        (node.inLinks || []).forEach(function (l) {
          links.push(l);
        });
        (node.outLinks || []).forEach(function (l) {
          links.push(l);
        });
        _self.scene.remove(node);
        _self.nodes.splice(index, 1);
      }
      links.forEach(function (l) {
        index = _self.links.indexOf(l);
        if (index > -1) {
          _self.scene.remove(l);
          _self.links.splice(index, 1);
        }
      });
      node = null;
      _self.refresh();
    }
  };
  VisualGraph.prototype.clearAll = function () {
    if (this.scene) {
      this.scene.clear();
    }
    this.nodes = [];
    this.links = [];
    this.nodeIdIndex = 1;
    this.currentNode = null;
    this.currentLink = null;
    this.currentLayout = null;
    this.clusterGroups = [];
    this.currentCluster = null;
    this.drawLinkFlag = false;
    this.virLink = null;
    this.setZoom('zoom1');
    this.stopRunningLayout(10);
    this.refresh();
  };
  VisualGraph.prototype.rightMenuOprate = function (optType) {
    var self = this;
    switch (optType) {
      case 'allSelect':
        self.selectAll();
        break;
      case 'rebackSel':
        self.reverseSelect();
        break;
      case 'showAll':
        self.showAll();
        break;
      case 'selRelate':
        self.selectRelate();
        break;
      case 'showNodes':
        self.showNodes();
        break;
      case 'showSelNode':
        self.showSelected();
        break;
      case 'hideSelNode':
        self.hideSelected();
        break;
      case 'delSelect':
        self.delSelect();
        break;
      case 'clearAll':
        this.clearAll();
        break;
      case 'hideIsolatedNodes':
        self.hideIsolatedNodes();
        break;
      case 'showLinks':
        self.showAllLink();
        break;
      case 'hideLinks':
        self.hideAllLink();
        break;
      case 'sourcelphaMap':
        self.nodeMapAlphaByDegree();
        break;
      case 'saveImage':
        self.saveImage(5000, 5000);
        break;
      case 'deleteNode':
        self.deleteNode(self.currentNode);
        self.currentNode = null;
        break;
      case 'nodeConnent':
        self.beginAddLine(self.currentNode);
        break;
      case 'delEdge':
        self.deleteLink(self.currentLink);
        self.currentLink = null;
        break;
      case 'expanded':
        self.expanded(self.currentNode);
        break;
      case 'contract':
        self.contract(self.currentNode);
        break;
      case 'directedLine':
        self.setLineDirected(true);
        break;
      case 'undirectedLine':
        self.setLineDirected(false);
        break;
      case 'showLineLabel':
        self.showLinkLabel(true);
        break;
      case 'hideLineLabel':
        self.showLinkLabel(false);
        break;
      case 'Rline':
        self.setLineDashed(false);
        break;
      case 'Vline':
        self.setLineDashed(true);
        break;
      default:
        break;
    }
  };
  VisualGraph.prototype.beginAddLine = function (callback) {
    this.drawLinkFlag = true;
    if (callback && typeof callback === 'function') {
      this.drawLineCallback = callback;
    }
  };
  VisualGraph.prototype.drawVirtualLine = function (nodeA, nodeB) {
    var self = this;
    var line = self.newEdge(nodeA, nodeB);
    self.scene.add(line);
    return line;
  };
  VisualGraph.prototype.drawVirtualNode = function (config) {
    var self = this;
    var node = self.newNode(config || { x: 10, y: 10, width: 5 });
    node.dragable = false;
    node.fixed = true;
    self.scene.add(node);
    return node;
  };
  VisualGraph.prototype.removeLine = function (line) {
    this.scene.remove(line);
    this.refresh();
  };
  VisualGraph.prototype.getMousePosition = function (event) {
    var p = DGraph.util.getEventPosition(event);
    return { x: p.x, y: p.y };
  };
  VisualGraph.prototype.computeParentAngle = function (node) {
    node = node || {};
    var angleRadian = 0;
    var parentNodes = [],
      parentFlag = true;
    (node.inLinks || []).forEach(function (l) {
      parentNodes.push(l.source);
    });
    if (parentNodes.length == 0) {
      parentFlag = false;
      (node.outLinks || []).forEach(function (l) {
        parentNodes.push(l.target);
      });
    }
    var maxParentNode;
    maxParentNode = parentNodes.sort(function (n1, n2) {
      if (parentFlag) {
        return (
          (n1.outLinks || []).length + (n1.inLinks || []).length <
          (n2.outLinks || []).length + (n2.inLinks || []).length
        );
      } else {
        return (
          (n1.outLinks || []).length + (n1.inLinks || []).length >
          (n2.outLinks || []).length + (n2.inLinks || []).length
        );
      }
    })[0];
    if (maxParentNode) {
      var xp = maxParentNode.cx,
        yp = maxParentNode.cy;
      var x0 = node.cx,
        y0 = node.cy;
      angleRadian = Math.atan2(y0 - yp, x0 - xp);
    }
    return angleRadian;
  };
  VisualGraph.prototype.activeAddNodeLinks = function (_nodes, _links) {
    var _self = this;
    _self.incremaNodesCodinate(_nodes);
    var newNodes = [],
      newLinks = [];
    (_nodes || []).forEach(function (_node, i) {
      var hasNodes = _self.nodes.filter(function (n) {
        return n.id == _node.id;
      });
      if (hasNodes.length == 0) {
        if (_self.currentNode != null) {
          if (_node.id != _self.currentNode.id) {
            var node = _self.newNode(_node);
            _self.nodes.push(node);
            _self.scene.add(node);
            newNodes.push(node);
          } else {
            _self.currentNode.id = _node.id;
          }
        } else {
          var node = _self.newNode(_node);
          _self.nodes.push(node);
          _self.scene.add(node);
          newNodes.push(node);
        }
      }
    });
    var _nodes_ = _self.nodes;
    (_links || []).forEach(function (_link) {
      var hasLinks = _self.links.filter(function (l) {
        return l.source.id == _link.source && l.target.id == _link.target;
      });
      if (hasLinks.length == 0) {
        var sourceNode = _nodes_.filter(function (_node) {
          return _node.id == _link.source;
        })[0];
        var targetNode = _nodes_.filter(function (_node) {
          return _node.id == _link.target;
        })[0];
        if (sourceNode != null && targetNode != null) {
          var link = _self.newEdge(sourceNode, targetNode);
          link.id = _link.id || '';
          link.type = _link.type || 'default';
          link.label = _link.label || '';
          link.showlabel = _link.showlabel || _self.config.link.label.show;
          link.lineWidth =
            Number(_link.lineWidth) || _self.config.link.lineWidth;
          link.weight = Number(_link.weight) || 1;
          link.lineType = _link.lineType || _self.config.link.lineType;
          link.lineDash = _link.lineDash || _self.config.link.lineDash;
          link.strokeColor = _link.color || _self.config.link.color;
          link.font = _link.font || _self.config.link.label.font;
          link.fontColor = _link.fontColor || _self.config.link.label.color;
          link.properties = _link.properties || {};
          _self.links.push(link);
          _self.scene.add(link);
          newLinks.push(link);
        }
      }
    });
    var unResetNodes = _self.nodes.filter(function (n) {
      return !n.hasOwnProperty('charge');
    });
    unResetNodes.forEach(function (n) {
      newNodes.push(n);
    });
    if (_self.currentNode != null) {
      newNodes.push(_self.currentNode);
    }
    if (newNodes.length > 1) {
      if (_self.currentNode != null) {
        (_self.currentNode.inLinks || []).forEach(function (l) {
          var isNewNode = newNodes.filter(function (n) {
            return n == l.source;
          });
          if (isNewNode == null || isNewNode.length == 0) {
            l.source.fixed = true;
          }
        });
        _self.currentNode.fixed = true;
      }
      _self.collideNodes(_self.nodes);
      var centerX = (_self.currentNode || { x: 100 }).x || 100;
      var centerY = (_self.currentNode || { y: 100 }).y || 100;
      newNodes.forEach((tnode) => {
        var targetX = tnode.x,
          targetY = tnode.y;
        (tnode.x = centerX), (tnode.y = centerY);
        _self.animate({
          targets: tnode,
          x: targetX,
          y: targetY,
          duration: 500,
          easing: 'spring',
        });
      });
    }
  };
  VisualGraph.prototype.incremaNodesCodinate = function (nodes) {
    var radius = computeRadius(nodes);
    var centerNode = this.currentNode || { x: 100, y: 100 };
    var angle = this.computeParentAngle(centerNode);
    var x1 = centerNode.x + radius * Math.cos(angle);
    var y1 = centerNode.y + radius * Math.sin(angle);
    centerNode.x = x1;
    centerNode.y = y1;
    var nodeCount = nodes.length;
    var xyArr = getXY(centerNode, nodeCount, radius);
    nodes.forEach((n, i) => {
      n.x = xyArr[i].x;
      n.y = xyArr[i].y;
    });
    function computeRadius(_nodes) {
      var nodeRadius = 20;
      var area = 2 * Math.PI * nodeRadius * nodeRadius * _nodes.length;
      var radius = Math.round(Math.sqrt(area, 3));
      return radius;
    }
    function getXYA(centerNode, nodeCount, raduis) {
      var aop = 360.0 / nodeCount;
      var arr = [];
      for (var i = 0; i < nodeCount; i++) {
        var r1 = raduis;
        if (nodeCount > 10) {
          r1 = i % 2 == 0 ? raduis + 35 : raduis - 35;
        }
        var ao = i * aop;
        var o1 = {};
        o1.x = centerNode.x + r1 * Math.cos((ao * Math.PI) / 180);
        o1.y = centerNode.y + r1 * Math.sin((ao * Math.PI) / 180);
        arr[i] = o1;
      }
      return arr;
    }
    function getXY(centerNode, nodeCount, raduis) {
      if (nodeCount <= 30) {
        return getXYA(centerNode, nodeCount, raduis);
      }
      var arr = [];
      for (var i = 0; i < nodeCount; i++) {
        var phi = Math.acos(-1 + (2 * i) / nodeCount);
        var theta = Math.sqrt(nodeCount * Math.PI) * phi;
        var sinPhiRadius = Math.sin(phi) * radius;
        var o1 = {};
        o1.x = centerNode.x + sinPhiRadius * Math.sin(theta);
        o1.y = centerNode.y + Math.cos(phi) * radius;
        arr[i] = o1;
      }
      return arr;
    }
  };
  VisualGraph.prototype.collideNodes = function (nodes) {
    var self = this;
    var q = self.quadtree(nodes);
    let num = 1;
    while (num++ <= 20) {
      nodes.forEach(function (_node) {
        q.visit(collide(_node));
      });
    }
    function collide(node) {
      var nr = node.radius * node.scaleX * 2,
        nx1 = node.x - nr,
        nx2 = node.x + nr,
        ny1 = node.y - nr,
        ny2 = node.y + nr;
      return function (quad, x1, y1, x2, y2) {
        if (quad.point && quad.point !== node) {
          var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = nr + quad.point.radius;
          if (l < r) {
            l = ((l - r) / l) * 0.5;
            node.x -= x *= l;
            node.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      };
    }
  };
  VisualGraph.prototype.quadtree = function (points) {
    var p,
      i = -1,
      n = points.length;
    if (n && isNaN(points[0].x)) {
      points = points.map(function (p) {
        return { x: p[0], y: p[1] };
      });
    }
    var x1 = (y1 = Infinity);
    var x2 = (y2 = -Infinity);
    while (++i < n) {
      p = points[i];
      if (p.x < x1) {
        x1 = p.x;
      }
      if (p.y < y1) {
        y1 = p.y;
      }
      if (p.x > x2) {
        x2 = p.x;
      }
      if (p.y > y2) {
        y2 = p.y;
      }
    }
    var dx = x2 - x1,
      dy = y2 - y1;
    if (dx > dy) {
      y2 = y1 + dx;
    } else {
      x2 = x1 + dy;
    }
    function insert(n, p, x1, y1, x2, y2) {
      if (isNaN(p.x) || isNaN(p.y)) {
        return;
      }
      if (n.leaf) {
        var v = n.point;
        if (v) {
          if (Math.abs(v.x - p.x) + Math.abs(v.y - p.y) < 0.01) {
            insertChild(n, p, x1, y1, x2, y2);
          } else {
            n.point = null;
            insertChild(n, v, x1, y1, x2, y2);
            insertChild(n, p, x1, y1, x2, y2);
          }
        } else {
          n.point = p;
        }
      } else {
        insertChild(n, p, x1, y1, x2, y2);
      }
    }
    function insertChild(n, p, x1, y1, x2, y2) {
      var sx = (x1 + x2) * 0.5,
        sy = (y1 + y2) * 0.5,
        right = p.x >= sx,
        bottom = p.y >= sy,
        i = (bottom << 1) + right;
      n.leaf = false;
      n = n.nodes[i] || (n.nodes[i] = { leaf: true, nodes: [], point: null });
      if (right) {
        x1 = sx;
      } else {
        x2 = sx;
      }
      if (bottom) {
        y1 = sy;
      } else {
        y2 = sy;
      }
      insert(n, p, x1, y1, x2, y2);
    }
    function quadtreeVisit(f, node, x1, y1, x2, y2) {
      if (!f(node, x1, y1, x2, y2)) {
        var sx = (x1 + x2) * 0.5,
          sy = (y1 + y2) * 0.5,
          children = node.nodes;
        if (children[0]) {
          quadtreeVisit(f, children[0], x1, y1, sx, sy);
        }
        if (children[1]) {
          quadtreeVisit(f, children[1], sx, y1, x2, sy);
        }
        if (children[2]) {
          quadtreeVisit(f, children[2], x1, sy, sx, y2);
        }
        if (children[3]) {
          quadtreeVisit(f, children[3], sx, sy, x2, y2);
        }
      }
    }
    var root = { leaf: true, nodes: [], point: null };
    root.add = function (p) {
      insert(root, p, x1, y1, x2, y2);
    };
    root.visit = function (f) {
      quadtreeVisit(f, root, x1, y1, x2, y2);
    };
    points.forEach(root.add);
    return root;
  };
  VisualGraph.prototype.stopRunningLayout = function (layzeTime) {
    var self = this;
    setTimeout(function () {
      cancelAnimationFrame(self.forceOptions.loopName);
      self.forceOptions.loopName = null;
      self.forceOptions.alpha = 0;
    }, layzeTime);
  };
  VisualGraph.prototype.loopRunLayout = function (callback) {
    var _self = this;
    if (typeof callback == 'function') {
      cancelAnimationFrame(_self.forceOptions.loopName);
      _self.forceOptions.loopName = null;
      function loop() {
        cancelAnimationFrame(_self.forceOptions.loopName);
        callback();
        _self.refresh();
        _self.forceOptions.loopName = requestAnimationFrame(loop);
      }
      _self.forceOptions.loopName = requestAnimationFrame(loop);
    }
  };
  VisualGraph.prototype.runLayoutEngin = function (nodes, links, alpha) {
    var _self = this;
    if (nodes.length == 0) {
      return;
    }
    _self.forceOptions.alpha = alpha || 0.5;
    _self.loopRunLayout(tick);
    function tick() {
      if ((_self.forceOptions.alpha *= 0.99) < 0.001) {
        _self.stopRunningLayout(10);
        _self.forceOptions.alpha = 0;
        return;
      }
      var q, i, o, s, t, l, k, x, y;
      links.forEach(function (link, i) {
        s = link.source;
        t = link.target;
        x = t.x - s.x;
        y = t.y - s.y;
        if ((l = x * x + y * y)) {
          l =
            (_self.forceOptions.alpha *
              link.strength *
              ((l = Math.sqrt(l)) - link.distance)) /
            l;
          x *= l;
          y *= l;
          t.x -= x * (k = s.weight / (t.weight + s.weight));
          t.y -= y * k;
          s.x += x * (k = 1 - k);
          s.y += y * k;
        }
      });
      var n = nodes.length;
      if ((k = _self.forceOptions.alpha * _self.forceOptions.gravity)) {
        x = _self.forceOptions.size[0] / 2;
        y = _self.forceOptions.size[1] / 2;
        i = -1;
        if (k) {
          while (++i < n) {
            o = nodes[i];
            o.x += (x - o.x) * k;
            o.y += (y - o.y) * k;
          }
        }
      }
      if (_self.forceOptions.charge) {
        forceAccumulate((q = _self.quadtree(nodes)), _self.forceOptions.alpha);
        i = -1;
        while (++i < n) {
          if (!(o = nodes[i]).fixed) {
            q.visit(repulse(o));
          }
        }
      }
      i = -1;
      while (++i < n) {
        o = nodes[i];
        if (o.fixed) {
          if (!o.isDragging) {
            o.x = o.px;
            o.y = o.py;
          } else {
            o.px = o.x;
            o.py = o.y;
          }
        } else {
          o.x -= (o.px - (o.px = o.x)) * _self.forceOptions.friction;
          o.y -= (o.py - (o.py = o.y)) * _self.forceOptions.friction;
          if (_self.forceOptions.noverlap == true) {
            q.visit(collide(o));
          }
        }
      }
      function repulse(node) {
        return function (quad, x1, y1, x2, y2) {
          if (quad.point !== node) {
            var dx = quad.cx - node.x,
              dy = quad.cy - node.y,
              dn = 1 / Math.sqrt(dx * dx + dy * dy);
            if ((x2 - x1) * dn < _self.forceOptions.theta) {
              var k = quad.charge * dn * dn;
              node.px -= dx * k;
              node.py -= dy * k;
              return true;
            }
            if (quad.point && isFinite(dn)) {
              var k = quad.pointCharge * dn * dn;
              node.px -= dx * k;
              node.py -= dy * k;
            }
          }
          return !quad.charge;
        };
      }
      function collide(node) {
        var nodeR = node.radius * node.scaleX * 2,
          nx1 = node.x - nodeR,
          nx2 = node.x + nodeR,
          ny1 = node.y - nodeR,
          ny2 = node.y + nodeR;
        return function (quad, x1, y1, x2, y2) {
          if (quad.point && quad.point !== node) {
            var x = node.x - quad.point.x,
              y = node.y - quad.point.y,
              l = Math.sqrt(x * x + y * y),
              r = nodeR + quad.point.radius;
            if (l < r) {
              l = ((l - r) / l) * 0.5;
              node.x -= x *= l;
              node.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
      }
    }
    function forceAccumulate(quad, alpha) {
      var cx = 0,
        cy = 0;
      quad.charge = 0;
      if (!quad.leaf) {
        var nodes = quad.nodes,
          n = nodes.length,
          i = -1,
          c;
        while (++i < n) {
          c = nodes[i];
          if (c == null) {
            continue;
          }
          forceAccumulate(c, alpha);
          quad.charge += c.charge;
          cx += c.charge * c.cx;
          cy += c.charge * c.cy;
        }
      }
      if (quad.point) {
        if (!quad.leaf) {
          quad.point.x += Math.random() - 0.5;
          quad.point.y += Math.random() - 0.5;
        }
        var k = _self.forceOptions.alpha * quad.point.charge;
        quad.charge += quad.pointCharge = k;
        cx += k * quad.point.x;
        cy += k * quad.point.y;
      }
      quad.cx = cx / quad.charge;
      quad.cy = cy / quad.charge;
    }
  };
  VisualGraph.prototype.getAllSelectedNodes = function () {
    var nodes = this.nodes.filter(function (n) {
      return n.selected == true;
    });
    return nodes;
  };
  VisualGraph.prototype.findNodeByAttr = function (attr, value) {
    var nodes = this.nodes.filter(function (n) {
      return n[attr] == value;
    });
    if (nodes.length > 0) {
      var node = nodes[0];
      return node;
    }
    return null;
  };
  VisualGraph.prototype.findNodeById = function (nodeId) {
    var nodes = this.nodes.filter(function (n) {
      return n.id == nodeId;
    });
    if (nodes.length > 0) {
      var node = nodes[0];
      node.selected = true;
      node.visible = true;
      this.scene.addToSelected(node);
      this.focusTargetEle(node);
      return node;
    }
    return null;
  };
  VisualGraph.prototype.updateNodeLabel = function (nodeId, nodeName) {
    var node = this.nodes.filter(function (_node) {
      return _node.id == nodeId;
    })[0];
    if (node) {
      node.label = nodeName;
      node.text = nodeName;
      this.refresh();
    }
  };
  VisualGraph.prototype.switchAnimate = function (flag) {
    if (!flag) {
      this.stage.fps = -25;
    } else {
      this.stage.fps = 25;
    }
  };
  VisualGraph.prototype.randomColor = function () {
    return (
      Math.floor(255 * Math.random()) +
      ',' +
      Math.floor(180 * Math.random()) +
      ',' +
      Math.floor(255 * Math.random())
    );
  };
  VisualGraph.prototype.buildVisualGraphData = function (_nodes, _links) {
    var nodeIdMapNode = {};
    _nodes.forEach(function (n) {
      n.scaleX = 1;
      n.scaleY = 1;
      n.radius = n.radius || n.width || 30;
      n.x = n.x || Math.round(Math.random() * 1000);
      n.y = n.y || Math.round(Math.random() * 1000);
      n.cx = n.x;
      n.cy = n.x;
      if (n.id == 1) {
        n.selected = true;
      } else {
        n.selected = false;
      }
      nodeIdMapNode[n.id] = n;
    });
    var links = [];
    _links.forEach(function (l) {
      var sourceNode = nodeIdMapNode[l.source],
        targetNode = nodeIdMapNode[l.target];
      if (sourceNode) {
        sourceNode.outLinks = sourceNode.outLinks || [];
        sourceNode.outLinks.push({ source: sourceNode, target: targetNode });
      }
      if (targetNode) {
        targetNode.inLinks = targetNode.inLinks || [];
        targetNode.inLinks.push({ source: sourceNode, target: targetNode });
      }
      links.push({ source: sourceNode, target: targetNode });
    });
    _nodes = [];
    for (var id in nodeIdMapNode) {
      _nodes.push(nodeIdMapNode[id]);
    }
    return { nodes: _nodes, links: links };
  };
  VisualGraph.prototype.animate = function (config) {
    var _self = this;
    var defaultInstanceSettings = {
      update: null,
      begin: null,
      loopBegin: null,
      changeBegin: null,
      change: null,
      changeComplete: null,
      loopComplete: null,
      complete: null,
      loop: 1,
      direction: 'normal',
      autoplay: true,
      timelineOffset: 0,
    };
    var defaultTweenSettings = {
      duration: 1000,
      delay: 0,
      endDelay: 0,
      easing: 'easeOutElastic(1,.5)',
      round: 0,
    };
    function minMax(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }
    function applyArguments(func, args) {
      if (func) {
        return func.apply(null, args);
      }
      return;
    }
    var is = {
      arr: function (a) {
        return Array.isArray(a);
      },
      obj: function (a) {
        return Object.prototype.toString.call(a).indexOf('Object') > -1;
      },
      str: function (a) {
        return typeof a === 'string';
      },
      fnc: function (a) {
        return typeof a === 'function';
      },
      und: function (a) {
        return typeof a === 'undefined';
      },
      key: function (a) {
        return (
          !defaultInstanceSettings.hasOwnProperty(a) &&
          !defaultTweenSettings.hasOwnProperty(a) &&
          a !== 'targets' &&
          a !== 'keyframes'
        );
      },
    };
    function parseEasingParameters(string) {
      var match = /\(([^)]+)\)/.exec(string);
      return match
        ? match[1].split(',').map(function (p) {
            return parseFloat(p);
          })
        : [];
    }
    var cache = { springs: {} };
    function spring(string, duration) {
      var params = parseEasingParameters(string);
      var mass = minMax(is.und(params[0]) ? 1 : params[0], 0.1, 100);
      var stiffness = minMax(is.und(params[1]) ? 100 : params[1], 0.1, 100);
      var damping = minMax(is.und(params[2]) ? 10 : params[2], 0.1, 100);
      var velocity = minMax(is.und(params[3]) ? 0 : params[3], 0.1, 100);
      var w0 = Math.sqrt(stiffness / mass);
      var zeta = damping / (2 * Math.sqrt(stiffness * mass));
      var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
      var a = 1;
      var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;
      function solver(t) {
        var progress = duration ? (duration * t) / 1000 : t;
        if (zeta < 1) {
          progress =
            Math.exp(-progress * zeta * w0) *
            (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
        } else {
          progress = (a + b * progress) * Math.exp(-progress * w0);
        }
        if (t === 0 || t === 1) {
          return t;
        }
        return 1 - progress;
      }
      function getDuration() {
        var cached = cache.springs[string];
        if (cached) {
          return cached;
        }
        var frame = 1 / 6;
        var elapsed = 0;
        var rest = 0;
        while (true) {
          elapsed += frame;
          if (solver(elapsed) === 1) {
            rest++;
            if (rest >= 16) {
              break;
            }
          } else {
            rest = 0;
          }
        }
        var duration = elapsed * frame * 1000;
        cache.springs[string] = duration;
        return duration;
      }
      return duration ? solver : getDuration;
    }
    function steps(steps) {
      if (steps === void 0) steps = 10;
      return function (t) {
        return Math.round(t * steps) * (1 / steps);
      };
    }
    var penner = (function () {
      var eases = {
        linear: function () {
          return function (t) {
            return t;
          };
        },
      };
      var functionEasings = {
        Sine: function () {
          return function (t) {
            return 1 - Math.cos((t * Math.PI) / 2);
          };
        },
        Circ: function () {
          return function (t) {
            return 1 - Math.sqrt(1 - t * t);
          };
        },
        Back: function () {
          return function (t) {
            return t * t * (3 * t - 2);
          };
        },
        Bounce: function () {
          return function (t) {
            var pow2,
              b = 4;
            while (t < ((pow2 = Math.pow(2, --b)) - 1) / 11) {}
            return (
              1 / Math.pow(4, 3 - b) -
              7.5625 * Math.pow((pow2 * 3 - 2) / 22 - t, 2)
            );
          };
        },
        Elastic: function (amplitude, period) {
          if (amplitude === void 0) amplitude = 1;
          if (period === void 0) period = 0.5;
          var a = minMax(amplitude, 1, 10);
          var p = minMax(period, 0.1, 2);
          return function (t) {
            return t === 0 || t === 1
              ? t
              : -a *
                  Math.pow(2, 10 * (t - 1)) *
                  Math.sin(
                    ((t - 1 - (p / (Math.PI * 2)) * Math.asin(1 / a)) *
                      (Math.PI * 2)) /
                      p
                  );
          };
        },
      };
      var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'];
      baseEasings.forEach(function (name, i) {
        functionEasings[name] = function () {
          return function (t) {
            return Math.pow(t, i + 2);
          };
        };
      });
      Object.keys(functionEasings).forEach(function (name) {
        var easeIn = functionEasings[name];
        eases['easeIn' + name] = easeIn;
        eases['easeOut' + name] = function (a, b) {
          return function (t) {
            return 1 - easeIn(a, b)(1 - t);
          };
        };
        eases['easeInOut' + name] = function (a, b) {
          return function (t) {
            return t < 0.5
              ? easeIn(a, b)(t * 2) / 2
              : 1 - easeIn(a, b)(t * -2 + 2) / 2;
          };
        };
      });
      return eases;
    })();
    function parseEasings(easing, duration) {
      if (is.fnc(easing)) {
        return easing;
      }
      var name = easing.split('(')[0];
      var ease = penner[name];
      var args = parseEasingParameters(easing);
      switch (name) {
        case 'spring':
          return spring(easing, duration);
        case 'steps':
          return applyArguments(steps, args);
        default:
          return applyArguments(ease, args);
      }
    }
    function filterArray(arr, callback) {
      var len = arr.length;
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      var result = [];
      for (var i = 0; i < len; i++) {
        if (i in arr) {
          var val = arr[i];
          if (callback.call(thisArg, val, i, arr)) {
            result.push(val);
          }
        }
      }
      return result;
    }
    function flattenArray(arr) {
      return arr.reduce(function (a, b) {
        return a.concat(is.arr(b) ? flattenArray(b) : b);
      }, []);
    }
    function toArray(o) {
      if (is.arr(o)) {
        return o;
      }
      if (o instanceof NodeList || o instanceof HTMLCollection) {
        return [].slice.call(o);
      }
      return [o];
    }
    function cloneObject(o) {
      var clone = {};
      for (var p in o) {
        clone[p] = o[p];
      }
      return clone;
    }
    function replaceObjectProps(o1, o2) {
      var o = cloneObject(o1);
      for (var p in o1) {
        o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p];
      }
      return o;
    }
    function mergeObjects(o1, o2) {
      var o = cloneObject(o1);
      for (var p in o2) {
        o[p] = is.und(o1[p]) ? o2[p] : o1[p];
      }
      return o;
    }
    function getUnit(val) {
      var split =
        /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(
          val
        );
      if (split) {
        return split[1];
      }
    }
    function getFunctionValue(val, animatable) {
      if (!is.fnc(val)) {
        return val;
      }
      return val(animatable.target, animatable.id, animatable.total);
    }
    function getOriginalTargetValue(target, propName, unit, animatable) {
      return target[propName] || 0;
    }
    function getRelativeValue(to, from) {
      var operator = /^(\*=|\+=|-=)/.exec(to);
      if (!operator) {
        return to;
      }
      var u = getUnit(to) || 0;
      var x = parseFloat(from);
      var y = parseFloat(to.replace(operator[0], ''));
      switch (operator[0][0]) {
        case '+':
          return x + y + u;
        case '-':
          return x - y + u;
        case '*':
          return x * y + u;
      }
    }
    function validateValue(val, unit) {
      if (/\s/g.test(val)) {
        return val;
      }
      var originalUnit = getUnit(val);
      var unitLess = originalUnit
        ? val.substr(0, val.length - originalUnit.length)
        : val;
      if (unit) {
        return unitLess + unit;
      }
      return unitLess;
    }
    function decomposeValue(val, unit) {
      var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
      var value = validateValue(val, unit) + '';
      return {
        original: value,
        numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
        strings: is.str(val) || unit ? value.split(rgx) : [],
      };
    }
    function parseTargets(targets) {
      var targetsArray = targets
        ? flattenArray(
            is.arr(targets) ? targets.map(toArray) : toArray(targets)
          )
        : [];
      return filterArray(targetsArray, function (item, pos, self) {
        return self.indexOf(item) === pos;
      });
    }
    function getAnimatables(targets) {
      var parsed = parseTargets(targets);
      return parsed.map(function (t, i) {
        return { target: t, id: i, total: parsed.length };
      });
    }
    function normalizePropertyTweens(prop, tweenSettings) {
      var settings = cloneObject(tweenSettings);
      if (/^spring/.test(settings.easing)) {
        settings.duration = spring(settings.easing);
      }
      if (is.arr(prop)) {
        var l = prop.length;
        var isFromTo = l === 2 && !is.obj(prop[0]);
        if (!isFromTo) {
          if (!is.fnc(tweenSettings.duration)) {
            settings.duration = tweenSettings.duration / l;
          }
        } else {
          prop = { value: prop };
        }
      }
      var propArray = is.arr(prop) ? prop : [prop];
      return propArray
        .map(function (v, i) {
          var obj = is.obj(v) ? v : { value: v };
          if (is.und(obj.delay)) {
            obj.delay = !i ? tweenSettings.delay : 0;
          }
          if (is.und(obj.endDelay)) {
            obj.endDelay =
              i === propArray.length - 1 ? tweenSettings.endDelay : 0;
          }
          return obj;
        })
        .map(function (k) {
          return mergeObjects(k, settings);
        });
    }
    function flattenKeyframes(keyframes) {
      var propertyNames = filterArray(
        flattenArray(
          keyframes.map(function (key) {
            return Object.keys(key);
          })
        ),
        function (p) {
          return is.key(p);
        }
      ).reduce(function (a, b) {
        if (a.indexOf(b) < 0) {
          a.push(b);
        }
        return a;
      }, []);
      var properties = {};
      var loop = function (i) {
        var propName = propertyNames[i];
        properties[propName] = keyframes.map(function (key) {
          var newKey = {};
          for (var p in key) {
            if (is.key(p)) {
              if (p == propName) {
                newKey.value = key[p];
              }
            } else {
              newKey[p] = key[p];
            }
          }
          return newKey;
        });
      };
      for (var i = 0; i < propertyNames.length; i++) loop(i);
      return properties;
    }
    function getProperties(tweenSettings, params) {
      var properties = [];
      var keyframes = params.keyframes;
      if (keyframes) {
        params = mergeObjects(flattenKeyframes(keyframes), params);
      }
      for (var p in params) {
        if (is.key(p)) {
          properties.push({
            name: p,
            tweens: normalizePropertyTweens(params[p], tweenSettings),
          });
        }
      }
      return properties;
    }
    function normalizeTweenValues(tween, animatable) {
      var t = {};
      for (var p in tween) {
        var value = getFunctionValue(tween[p], animatable);
        if (is.arr(value)) {
          value = value.map(function (v) {
            return getFunctionValue(v, animatable);
          });
          if (value.length === 1) {
            value = value[0];
          }
        }
        t[p] = value;
      }
      t.duration = parseFloat(t.duration);
      t.delay = parseFloat(t.delay);
      return t;
    }
    function normalizeTweens(prop, animatable) {
      var previousTween;
      return prop.tweens.map(function (t) {
        var tween = normalizeTweenValues(t, animatable);
        var tweenValue = tween.value;
        var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
        var toUnit = getUnit(to);
        var originalValue = getOriginalTargetValue(
          animatable.target,
          prop.name,
          toUnit,
          animatable
        );
        var previousValue = previousTween
          ? previousTween.to.original
          : originalValue;
        var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
        var fromUnit = getUnit(from) || getUnit(originalValue);
        var unit = toUnit || fromUnit;
        if (is.und(to)) {
          to = previousValue;
        }
        tween.from = decomposeValue(from, unit);
        tween.to = decomposeValue(getRelativeValue(to, from), unit);
        tween.start = previousTween ? previousTween.end : 0;
        tween.end = tween.start + tween.delay + tween.duration + tween.endDelay;
        tween.easing = parseEasings(tween.easing, tween.duration);
        previousTween = tween;
        return tween;
      });
    }
    var setProgressValue = {
      object: function (t, p, v) {
        return (t[p] = v);
      },
    };
    function setTargetsValue(targets, properties) {
      var animatables = getAnimatables(targets);
      animatables.forEach(function (animatable) {
        for (var property in properties) {
          var value = getFunctionValue(properties[property], animatable);
          var target = animatable.target;
          var valueUnit = getUnit(value);
          var originalValue = getOriginalTargetValue(
            target,
            property,
            valueUnit,
            animatable
          );
          var unit = valueUnit || getUnit(originalValue);
          var to = getRelativeValue(validateValue(value, unit), originalValue);
          var animType = 'object';
          setProgressValue[animType](
            target,
            property,
            to,
            animatable.transforms,
            true
          );
        }
      });
    }
    function createAnimation(animatable, prop) {
      var tweens = normalizeTweens(prop, animatable);
      var lastTween = tweens[tweens.length - 1];
      return {
        type: 'object',
        property: prop.name,
        animatable: animatable,
        tweens: tweens,
        duration: lastTween.end,
        delay: tweens[0].delay,
        endDelay: lastTween.endDelay,
      };
    }
    function getAnimations(animatables, properties) {
      return filterArray(
        flattenArray(
          animatables.map(function (animatable) {
            return properties.map(function (prop) {
              return createAnimation(animatable, prop);
            });
          })
        ),
        function (a) {
          return !is.und(a);
        }
      );
    }
    function getInstanceTimings(animations, tweenSettings) {
      var animLength = animations.length;
      var getTlOffset = function (anim) {
        return anim.timelineOffset ? anim.timelineOffset : 0;
      };
      var timings = {};
      timings.duration = animLength
        ? Math.max.apply(
            Math,
            animations.map(function (anim) {
              return getTlOffset(anim) + anim.duration;
            })
          )
        : tweenSettings.duration;
      timings.delay = animLength
        ? Math.min.apply(
            Math,
            animations.map(function (anim) {
              return getTlOffset(anim) + anim.delay;
            })
          )
        : tweenSettings.delay;
      timings.endDelay = animLength
        ? timings.duration -
          Math.max.apply(
            Math,
            animations.map(function (anim) {
              return getTlOffset(anim) + anim.duration - anim.endDelay;
            })
          )
        : tweenSettings.endDelay;
      return timings;
    }
    var instanceID = 0;
    function createNewInstance(params) {
      var instanceSettings = replaceObjectProps(
        defaultInstanceSettings,
        params
      );
      var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
      var properties = getProperties(tweenSettings, params);
      var animatables = getAnimatables(params.targets);
      var animations = getAnimations(animatables, properties);
      var timings = getInstanceTimings(animations, tweenSettings);
      var id = instanceID;
      instanceID++;
      return mergeObjects(instanceSettings, {
        id: id,
        children: [],
        animatables: animatables,
        animations: animations,
        duration: timings.duration,
        delay: timings.delay,
        endDelay: timings.endDelay,
      });
    }
    var activeInstances = [];
    var pausedInstances = [];
    var raf;
    var engine = (function () {
      function play() {
        raf = requestAnimationFrame(step);
      }
      function step(t) {
        var activeInstancesLength = activeInstances.length;
        if (activeInstancesLength) {
          var i = 0;
          while (i < activeInstancesLength) {
            var activeInstance = activeInstances[i];
            if (!activeInstance.paused) {
              activeInstance.tick(t);
            } else {
              var instanceIndex = activeInstances.indexOf(activeInstance);
              if (instanceIndex > -1) {
                activeInstances.splice(instanceIndex, 1);
                activeInstancesLength = activeInstances.length;
              }
            }
            i++;
          }
          play();
        } else {
          raf = cancelAnimationFrame(raf);
        }
      }
      return play;
    })();
    function anime(params) {
      if (params === void 0) {
        params = {};
      }
      var startTime = 0,
        lastTime = 0,
        now = 0;
      var children,
        childrenLength = 0;
      var resolve = null;
      var speed = 1;
      _self.switchAnimate(true);
      function makePromise(instance) {
        var promise =
          window.Promise &&
          new Promise(function (_resolve) {
            return (resolve = _resolve);
          });
        instance.finished = promise;
        return promise;
      }
      var instance = createNewInstance(params);
      var promise = makePromise(instance);
      function toggleInstanceDirection() {
        var direction = instance.direction;
        if (direction !== 'alternate') {
          instance.direction = direction !== 'normal' ? 'normal' : 'reverse';
        }
        instance.reversed = !instance.reversed;
        children.forEach(function (child) {
          return (child.reversed = instance.reversed);
        });
      }
      function adjustTime(time) {
        return instance.reversed ? instance.duration - time : time;
      }
      function resetTime() {
        startTime = 0;
        lastTime = adjustTime(instance.currentTime) * (1 / speed);
      }
      function seekChild(time, child) {
        if (child) {
          child.seek(time - child.timelineOffset);
        }
      }
      function syncInstanceChildren(time) {
        if (!instance.reversePlayback) {
          for (var i = 0; i < childrenLength; i++) {
            seekChild(time, children[i]);
          }
        } else {
          for (var i$1 = childrenLength; i$1--; ) {
            seekChild(time, children[i$1]);
          }
        }
      }
      function setAnimationsProgress(insTime) {
        var i = 0;
        var animations = instance.animations;
        var animationsLength = animations.length;
        while (i < animationsLength) {
          var anim = animations[i];
          var animatable = anim.animatable;
          var tweens = anim.tweens;
          var tweenLength = tweens.length - 1;
          var tween = tweens[tweenLength];
          if (tweenLength) {
            tween =
              filterArray(tweens, function (t) {
                return insTime < t.end;
              })[0] || tween;
          }
          var elapsed =
            minMax(insTime - tween.start - tween.delay, 0, tween.duration) /
            tween.duration;
          var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
          var strings = tween.to.strings;
          var round = tween.round;
          var numbers = [];
          var toNumbersLength = tween.to.numbers.length;
          var progress = void 0;
          for (var n = 0; n < toNumbersLength; n++) {
            var value = void 0;
            var toNumber = tween.to.numbers[n];
            var fromNumber = tween.from.numbers[n] || 0;
            value = fromNumber + eased * (toNumber - fromNumber);
            numbers.push(value);
          }
          var stringsLength = strings.length;
          if (!stringsLength) {
            progress = numbers[0];
          } else {
            progress = strings[0];
            for (var s = 0; s < stringsLength; s++) {
              var a = strings[s];
              var b = strings[s + 1];
              var n$1 = numbers[s];
              if (!isNaN(n$1)) {
                if (!b) {
                  progress += n$1 + ' ';
                } else {
                  progress += n$1 + b;
                }
              }
            }
          }
          setProgressValue[anim.type](
            animatable.target,
            anim.property,
            progress,
            animatable.transforms
          );
          anim.currentValue = progress;
          i++;
        }
      }
      function setCallback(cb) {
        if (instance[cb] && !instance.passThrough) {
          instance[cb](instance);
        }
      }
      function countIteration() {
        if (instance.remaining && instance.remaining !== true) {
          instance.remaining--;
        }
      }
      function setInstanceProgress(engineTime) {
        var insDuration = instance.duration;
        var insDelay = instance.delay;
        var insEndDelay = insDuration - instance.endDelay;
        var insTime = adjustTime(engineTime);
        instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
        instance.reversePlayback = insTime < instance.currentTime;
        if (children) {
          syncInstanceChildren(insTime);
        }
        if (!instance.began && instance.currentTime > 0) {
          instance.began = true;
          setCallback('begin');
        }
        if (!instance.loopBegan && instance.currentTime > 0) {
          instance.loopBegan = true;
          setCallback('loopBegin');
        }
        if (insTime <= insDelay && instance.currentTime !== 0) {
          setAnimationsProgress(0);
        }
        if (
          (insTime >= insEndDelay && instance.currentTime !== insDuration) ||
          !insDuration
        ) {
          setAnimationsProgress(insDuration);
        }
        if (insTime > insDelay && insTime < insEndDelay) {
          if (!instance.changeBegan) {
            instance.changeBegan = true;
            instance.changeCompleted = false;
            setCallback('changeBegin');
          }
          setCallback('change');
          setAnimationsProgress(insTime);
        } else {
          if (instance.changeBegan) {
            instance.changeCompleted = true;
            instance.changeBegan = false;
            setCallback('changeComplete');
          }
        }
        instance.currentTime = minMax(insTime, 0, insDuration);
        if (instance.began) {
          setCallback('update');
        }
        if (engineTime >= insDuration) {
          lastTime = 0;
          countIteration();
          if (!instance.remaining) {
            instance.paused = true;
            if (!instance.completed) {
              instance.completed = true;
              setCallback('loopComplete');
              setCallback('complete');
              if (!instance.passThrough && 'Promise' in window) {
                resolve();
                promise = makePromise(instance);
              }
            }
          } else {
            startTime = now;
            setCallback('loopComplete');
            instance.loopBegan = false;
            if (instance.direction === 'alternate') {
              toggleInstanceDirection();
            }
          }
        }
      }
      instance.reset = function () {
        var direction = instance.direction;
        instance.passThrough = false;
        instance.currentTime = 0;
        instance.progress = 0;
        instance.paused = true;
        instance.began = false;
        instance.loopBegan = false;
        instance.changeBegan = false;
        instance.completed = false;
        instance.changeCompleted = false;
        instance.reversePlayback = false;
        instance.reversed = direction === 'reverse';
        instance.remaining = instance.loop;
        children = instance.children;
        childrenLength = children.length;
        for (var i = childrenLength; i--; ) {
          instance.children[i].reset();
        }
        if (
          (instance.reversed && instance.loop !== true) ||
          (direction === 'alternate' && instance.loop === 1)
        ) {
          instance.remaining++;
        }
        setAnimationsProgress(instance.reversed ? instance.duration : 0);
      };
      instance.set = function (targets, properties) {
        setTargetsValue(targets, properties);
        return instance;
      };
      instance.tick = function (t) {
        now = t;
        if (!startTime) {
          startTime = now;
        }
        setInstanceProgress((now + (lastTime - startTime)) * speed);
      };
      instance.seek = function (time) {
        setInstanceProgress(adjustTime(time));
      };
      instance.pause = function () {
        instance.paused = true;
        resetTime();
      };
      instance.play = function () {
        if (!instance.paused) {
          return;
        }
        if (instance.completed) {
          instance.reset();
        }
        instance.paused = false;
        activeInstances.push(instance);
        resetTime();
        if (!raf) {
          engine();
        }
      };
      instance.reverse = function () {
        toggleInstanceDirection();
        resetTime();
      };
      instance.restart = function () {
        instance.reset();
        instance.play();
      };
      instance.reset();
      if (instance.autoplay) {
        instance.play();
      }
      instance.timeline = function (params) {
        if (params === void 0) {
          params = {};
        }
        var tl = anime(params);
        tl.duration = 0;
        tl.add = function (instanceParams, timelineOffset) {
          var tlIndex = activeInstances.indexOf(tl);
          var children = tl.children;
          if (tlIndex > -1) {
            activeInstances.splice(tlIndex, 1);
          }
          function passThrough(ins) {
            ins.passThrough = true;
          }
          for (var i = 0; i < children.length; i++) {
            passThrough(children[i]);
          }
          var insParams = mergeObjects(
            instanceParams,
            replaceObjectProps(defaultTweenSettings, params)
          );
          insParams.targets = insParams.targets || params.targets;
          var tlDuration = tl.duration;
          insParams.autoplay = false;
          insParams.direction = tl.direction;
          insParams.timelineOffset = is.und(timelineOffset)
            ? tlDuration
            : getRelativeValue(timelineOffset, tlDuration);
          passThrough(tl);
          tl.seek(insParams.timelineOffset);
          var ins = anime(insParams);
          passThrough(ins);
          children.push(ins);
          var timings = getInstanceTimings(children, params);
          tl.delay = timings.delay;
          tl.endDelay = timings.endDelay;
          tl.duration = timings.duration;
          tl.seek(0);
          tl.reset();
          if (tl.autoplay) {
            tl.play();
          }
          return tl;
        };
        return tl;
      };
      return instance;
    }
    return anime(config);
  };
  var VisGraph = VisualGraph;
  if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = VisGraph;
  } else if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(function () {
      return VisGraph;
    });
  } else {
    this.VisGraph = VisGraph;
  }
}.call(this || (typeof window !== 'undefined' ? window : global)));
