/* Explainer kit: seek-safe moves keyed to spoken words. build.py puts this file and the frame's cues
   into one script: var Kit = ...; var k = Kit.frame(ID, WORDS); <cues>; k.done();
   Each frame needs its own copy: the runtime gives each frame script a `document` scoped to that frame. */
var Kit = (function () {
  var INK = "#1f2be0", PAPER = "#f0ebde", E = "power3.out";

  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ""); }

  function frame(id, words) {
    var R = '[data-composition-id="' + id + '"] ';
    var tl = gsap.timeline({ paused: true });

    // "path" = first "path"; "path#2" = second; "path+0.3" / "path#2-0.1" = offset in seconds; a number = seconds
    function at(cue) {
      if (typeof cue === "number") return cue;
      var m = /^(.+?)(?:#(\d+))?([+-][\d.]+)?$/.exec(String(cue).trim());
      var w = norm(m[1]), n = m[2] ? +m[2] : 1, off = m[3] ? +m[3] : 0, seen = 0;
      for (var i = 0; i < words.length; i++) {
        if (words[i][0] === w && ++seen === n) return Math.max(0, words[i][1] + off);
      }
      throw new Error(id + ': cue "' + cue + '" not found. Words: ' + words.map(function (x) { return x[0]; }).join(" "));
    }
    function els(sel) {
      var list = document.querySelectorAll(R + sel);
      if (!list.length) throw new Error(id + ': selector "' + sel + '" matches nothing');
      return Array.prototype.slice.call(list);
    }

    var k = {
      tl: tl, at: at, els: els,
      q: function (sel) { return els(sel)[0]; },
      // set properties at t=0 (initial state of a stage object in this frame)
      set: function (sel, props) { tl.set(els(sel), props, 0); return k; },
      // fade in, with optional start offset: { from: { x: -16 } }, { dur }, { stagger }
      appear: function (sel, cue, o) {
        o = o || {};
        var from = Object.assign({ opacity: 0 }, o.from || {});
        var to = { opacity: 1, duration: o.dur || 0.45, ease: o.ease || E, stagger: o.stagger || 0 };
        Object.keys(o.from || {}).forEach(function (p) { to[p] = p === "scale" ? 1 : 0; });
        tl.fromTo(els(sel), from, to, at(cue));
        return k;
      },
      // fade out, with optional end offset: { to: { y: 24 } }
      hide: function (sel, cue, o) {
        o = o || {};
        var from = { opacity: 1 }, to = Object.assign({ opacity: 0, duration: o.dur || 0.35, ease: o.ease || "power2.in", immediateRender: false }, o.to || {});
        Object.keys(o.to || {}).forEach(function (p) { from[p] = p === "scale" ? 1 : 0; });
        tl.fromTo(els(sel), from, to, at(cue));
        return k;
      },
      // replace one object with another at the same place
      swap: function (outSel, inSel, cue) {
        k.hide(outSel, cue, { to: { y: -10 }, dur: 0.3 });
        return k.appear(inSel, at(cue) + 0.1, { from: { y: 10 } });
      },
      // stroke-draw SVG paths/rects; each needs pathLength="1"
      draw: function (sel, cue, o) {
        o = o || {};
        tl.fromTo(els(sel), { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: o.dur || 0.45, ease: o.ease || "power2.inOut", stagger: o.stagger || 0 }, at(cue));
        return k;
      },
      // scale in from one edge: { origin: "left" | "right" | "top" | "bottom" }
      grow: function (sel, cue, o) {
        o = o || {};
        var org = o.origin || "left", horiz = org === "left" || org === "right";
        var origin = { left: "0% 50%", right: "100% 50%", top: "50% 0%", bottom: "50% 100%" }[org];
        var from = { transformOrigin: origin }, to = { duration: o.dur || 0.45, ease: o.ease || "power2.inOut" };
        from[horiz ? "scaleX" : "scaleY"] = 0; to[horiz ? "scaleX" : "scaleY"] = 1;
        tl.fromTo(els(sel), from, to, at(cue));
        return k;
      },
      // ink fill, paper text
      highlight: function (sel, cue) {
        tl.fromTo(els(sel), { backgroundColor: "rgba(31,43,224,0)", color: INK },
          { backgroundColor: INK, color: PAPER, duration: 0.35, ease: E }, at(cue));
        return k;
      },
      // title words: an array gives one cue per .k-word; one cue staggers them
      title: function (cues) {
        var ws = els(".k-title .k-word");
        ws.forEach(function (w, i) {
          var t = Array.isArray(cues) ? at(cues[Math.min(i, cues.length - 1)]) : at(cues == null ? 0 : cues) + i * 0.12;
          tl.fromTo(w, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: E }, t);
        });
        return k;
      },
      done: function () { window.__timelines[id] = tl; }
    };
    return k;
  }

  return { frame: frame };
})();
