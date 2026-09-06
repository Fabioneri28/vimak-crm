/* VIMAK CRM — Safe Extension Registry */
(function(){
  const registry = window.VIMAK_MODULES = window.VIMAK_MODULES || {
    installed: {},
    errors: [],
    register(route, renderer, meta){
      try{
        if(typeof VIEWS === "undefined" || !VIEWS) throw new Error("VIEWS registry unavailable");
        if(typeof renderer !== "function") throw new Error("Renderer must be a function");
        const previous = VIEWS[route];
        VIEWS[route] = function(){
          try{
            return renderer();
          }catch(err){
            console.error("[VIMAK module]", route, err);
            registry.errors.push({route,message:String(err?.message||err),at:new Date().toISOString()});
            if(typeof previous === "function") return previous();
            return `<div class="notice"><b>Módulo temporariamente indisponível.</b><br>${String(err?.message||err)}</div>`;
          }
        };
        registry.installed[route] = {meta:meta||{}, previous};
        return true;
      }catch(err){
        console.error("[VIMAK registry]", route, err);
        registry.errors.push({route,message:String(err?.message||err),at:new Date().toISOString()});
        return false;
      }
    }
  };
})();
