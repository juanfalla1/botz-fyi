import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const js = `(function(){
  try {
    var script = document.currentScript;
    if (!script) return;
    var url = new URL(script.src);
    var agentId = url.searchParams.get('agentId') || script.getAttribute('data-agent-id') || '';
    if (!agentId) {
      console.warn('[Botz Widget] Falta agentId en el script');
      return;
    }

    window.__botzWidgetInit = window.__botzWidgetInit || {};
    if (window.__botzWidgetInit[agentId]) return;
    window.__botzWidgetInit[agentId] = true;

    var origin = url.origin;
    var container = document.createElement('div');
    container.id = 'botz-widget-container-' + agentId;
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = '2147483000';
    container.style.fontFamily = 'Inter,system-ui,sans-serif';

    var button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Abrir chat Botz');
    button.innerHTML = '💬';
    button.style.width = '56px';
    button.style.height = '56px';
    button.style.border = 'none';
    button.style.borderRadius = '999px';
    button.style.background = '#a3e635';
    button.style.color = '#111827';
    button.style.fontSize = '24px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 14px 34px rgba(163,230,53,0.32)';

    var panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.width = 'min(92vw, 380px)';
    panel.style.height = 'min(78vh, 620px)';
    panel.style.marginBottom = '12px';
    panel.style.borderRadius = '14px';
    panel.style.overflow = 'hidden';
    panel.style.background = '#0b1220';
    panel.style.border = '1px solid rgba(255,255,255,0.16)';
    panel.style.boxShadow = '0 26px 70px rgba(0,0,0,0.38)';

    var frame = document.createElement('iframe');
    frame.title = 'Botz Widget';
    frame.src = origin + '/widget/agent?agentId=' + encodeURIComponent(agentId);
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = 'none';
    frame.allow = 'clipboard-write';

    panel.appendChild(frame);
    container.appendChild(panel);
    container.appendChild(button);
    document.body.appendChild(container);

    var open = false;
    var setOpen = function(next){
      open = !!next;
      panel.style.display = open ? 'block' : 'none';
      button.innerHTML = open ? '×' : '💬';
      button.style.fontSize = open ? '28px' : '24px';
    };

    button.addEventListener('click', function(){ setOpen(!open); });

    window.addEventListener('message', function(ev){
      if (ev.origin !== origin) return;
      if (ev && ev.data && ev.data.type === 'botz-widget-close') setOpen(false);
    });

    if (window.innerWidth < 560) {
      container.style.right = '10px';
      container.style.bottom = '10px';
      panel.style.width = 'calc(100vw - 20px)';
      panel.style.height = '72vh';
    }
  } catch (err) {
    console.error('[Botz Widget] Error inicializando', err);
  }
})();`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
