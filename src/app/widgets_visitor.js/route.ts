import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SCRIPT = `/* DARB VISITOR v7 */
(function(){
  try{
    var el = document.currentScript;
    var STORE_ID = el && el.getAttribute("data-store-id");
    if(!STORE_ID) return;

    // ===== Visitor ID =====
    var KEY = "darb_visitor_id";
    var vid = null;

    function genId(){
      return "v_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    }

    try{
      vid = localStorage.getItem(KEY);
      if(!vid){
        vid = genId();
        localStorage.setItem(KEY, vid);
      }
    }catch(e){
      vid = vid || genId();
    }

    window.DARB_VISITOR = {
      getId: function(){
        try{ return localStorage.getItem(KEY) || vid; }catch(e){ return vid; }
      }
    };

    function post(url, payload){
      try{
        fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function(){});
      }catch(e){}
    }

    // ===== Visit =====
    function canSendVisit(path){
      try{
        var k = "darb_visit_last:" + path;
        var now = Date.now();
        var last = Number(localStorage.getItem(k) || "0");
        if(now - last < 15000) return false;
        localStorage.setItem(k, String(now));
        return true;
      }catch(e){ return true; }
    }

    function sendVisit(){
      try{
        var v = window.DARB_VISITOR.getId();
        var path = location.pathname || "/";
        if(!v) return;
        if(!canSendVisit(path)) return;

        post("https://elyaia.vercel.app/api/widget/visit", {
          store_id: STORE_ID,
          visitor_id: v,
          path: path,
          page_url: location.href,
          referrer: document.referrer || null
        });
      }catch(e){}
    }

    // ===== Read Salla user from localStorage =====
    function readUser(){
      try{
        var raw = localStorage.getItem("user");
        if(!raw) return null;
        return JSON.parse(raw);
      }catch(e){
        return null;
      }
    }

    // ===== Identify =====
    function sendIdentifyOnce(){
      try{
        var v = window.DARB_VISITOR.getId();
        if(!v) return false;

        var u = readUser();
        if(!u || u.id == null) return false;

        var uid = String(u.id).trim();
        if(!uid || uid === "undefined" || uid === "null") return false;

        // منع spam: مرة كل ساعة لكل عميل
        var k = "darb_identify_last:" + uid;
        var now = Date.now();
        var last = Number(localStorage.getItem(k) || "0");
        if(now - last < 60 * 60 * 1000) return true;
        localStorage.setItem(k, String(now));

        var full = [u.first_name, u.last_name].filter(Boolean).join(" ");
        var email = u.email ? String(u.email) : null;
        var phone = u.mobile ? String(u.mobile) : null;

        post("https://elyaia.vercel.app/api/widget/identify", {
          store_id: STORE_ID,
          visitor_id: v,
          salla_customer_id: uid,
          customer_name: full || null,
          customer_email: email,
          customer_phone: phone
        });

        return true;
      }catch(e){
        return false;
      }
    }

    function tryIdentify(attempt){
      attempt = attempt || 0;
      if(sendIdentifyOnce()) return;
      if(attempt >= 40) return; // ~16s
      setTimeout(function(){ tryIdentify(attempt + 1); }, 400);
    }

    // run
    sendVisit();
    tryIdentify(0);

    // SPA
    var _ps = history.pushState;
    history.pushState = function(){
      _ps.apply(history, arguments);
      setTimeout(function(){ sendVisit(); tryIdentify(0); }, 120);
    };
    var _rs = history.replaceState;
    history.replaceState = function(){
      _rs.apply(history, arguments);
      setTimeout(function(){ sendVisit(); tryIdentify(0); }, 120);
    };
    window.addEventListener("popstate", function(){
      setTimeout(function(){ sendVisit(); tryIdentify(0); }, 120);
    });

  }catch(e){}
})();`;

export async function GET(_req: NextRequest) {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
