// Mini motor para abrir la maqueta sin internet ni Claude.
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p) { Object.assign(this.state, p); if (this.__render) this.__render(); }
}
window.DCLogic = DCLogic;

(function () {
  function ev(expr, scope) {
    return new Function('scope', 'with(scope){return (' + expr + ')}')(scope);
  }
  function interp(str, scope) {
    return str.replace(/\{\{([\s\S]*?)\}\}/g, function (_, e) {
      var v = ev(e, scope);
      return v === undefined || v === null ? '' : String(v);
    });
  }
  function build(node, scope, out) {
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(node.nodeValue.indexOf('{{') >= 0 ? interp(node.nodeValue, scope) : node.nodeValue));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      var list = ev(node.getAttribute('list').slice(2, -2), scope) || [];
      var as = node.getAttribute('as');
      list.forEach(function (item) {
        var s = Object.create(scope); s[as] = item;
        Array.prototype.forEach.call(node.childNodes, function (c) { build(c, s, out); });
      });
      return;
    }
    if (tag === 'sc-if') {
      if (ev(node.getAttribute('value').slice(2, -2), scope)) {
        Array.prototype.forEach.call(node.childNodes, function (c) { build(c, scope, out); });
      }
      return;
    }
    var el = document.createElement(tag);
    Array.prototype.forEach.call(node.attributes, function (a) {
      var n = a.name, v = a.value;
      if (n.indexOf('hint-') === 0) return;
      if (/^on/i.test(n) && /^\{\{[\s\S]*\}\}$/.test(v)) {
        var fn = ev(v.slice(2, -2), scope);
        el.addEventListener(n.slice(2).toLowerCase(), fn);
      } else {
        el.setAttribute(n, v.indexOf('{{') >= 0 ? interp(v, scope) : v);
      }
    });
    Array.prototype.forEach.call(node.childNodes, function (c) { build(c, el, el) || build(c, scope, el); });
    out.appendChild(el);
  }
  // build(c, el, el) trick avoided: use explicit version below
  function buildChildren(node, scope, out) {
    Array.prototype.forEach.call(node.childNodes, function (c) { build2(c, scope, out); });
  }
  var build2 = function (node, scope, out) {
    if (node.nodeType === 1) {
      var tag = node.tagName.toLowerCase();
      if (tag !== 'sc-for' && tag !== 'sc-if') {
        var el = document.createElement(tag);
        Array.prototype.forEach.call(node.attributes, function (a) {
          var n = a.name, v = a.value;
          if (n.indexOf('hint-') === 0) return;
          if (/^on/i.test(n) && /^\{\{[\s\S]*\}\}$/.test(v)) {
            el.addEventListener(n.slice(2).toLowerCase(), ev(v.slice(2, -2), scope));
          } else {
            el.setAttribute(n, v.indexOf('{{') >= 0 ? interp(v, scope) : v);
          }
        });
        buildChildren(node, scope, el);
        out.appendChild(el);
        return;
      }
      if (tag === 'sc-for') {
        var list = ev(node.getAttribute('list').slice(2, -2), scope) || [];
        var as = node.getAttribute('as');
        list.forEach(function (item) {
          var s = Object.create(scope); s[as] = item;
          buildChildren(node, s, out);
        });
        return;
      }
      if (ev(node.getAttribute('value').slice(2, -2), scope)) buildChildren(node, scope, out);
      return;
    }
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(node.nodeValue.indexOf('{{') >= 0 ? interp(node.nodeValue, scope) : node.nodeValue));
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var host = document.querySelector('x-dc');
    var helmet = host.querySelector('helmet');
    if (helmet) {
      Array.prototype.slice.call(helmet.children).forEach(function (c) { document.head.appendChild(c); });
      helmet.remove();
    }
    var tpl = document.createElement('div');
    while (host.firstChild) tpl.appendChild(host.firstChild);
    var scriptEl = document.querySelector('script[data-dc-script]');
    var Comp = new Function(scriptEl.textContent + '; return Component;')();
    var inst = new Comp({});
    function render() {
      var vals = inst.renderVals();
      var out = document.createElement('div');
      out.style.display = 'contents';
      buildChildren(tpl, vals, out);
      host.replaceChildren(out);
    }
    inst.__render = render;
    render();
  });
})();
