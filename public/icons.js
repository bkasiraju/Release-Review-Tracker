/* Local, lightweight icons: four small WebP illustrations plus inline SVG actions. */
(function(root){
 'use strict';
 const art={scope:'open-source',risk:'deviation',monthly:'sla',ai:'automation'};
 const paths={
  stack:'<rect x="4" y="4" width="16" height="5" rx="2"/><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 15h8M8 18h5"/>',
  health:'<path d="M3 12h4l2-6 4 12 2-6h6"/><circle cx="12" cy="12" r="10"/>',
  healthy:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  link:'<path d="m10 8 2-2a4 4 0 0 1 6 6l-2 2M14 16l-2 2a4 4 0 0 1-6-6l2-2m1 5 6-6"/>',
  view:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6m-3-3v6"/>',
  sync:'<path d="M5 9a7 7 0 0 1 12-4l2 2M19 4v4h-4M19 15a7 7 0 0 1-12 4l-2-2M5 20v-4h4"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 4h2"/>',
  columns:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16"/>',
  expandRows:'<rect x="3" y="8" width="18" height="8" rx="2"/><path d="m8 5 4-3 4 3M12 2v5m-4 12 4 3 4-3m-4 3v-5"/>',
  collapseRows:'<rect x="3" y="8" width="18" height="8" rx="2"/><path d="m8 2 4 3 4-3M12 1v5m-4 16 4-3 4 3m-4-3v5"/>',
  expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  publish:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 12 3 3 7-7"/>',
  home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  edit:'<path d="m5 16-1 5 5-1L20 9l-4-4Zm9-9 4 4"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chart:'<path d="M4 4v16h16M8 15v-4m5 4V7m5 8V5"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>'
 };
 const tones=new Set(['violet','blue','green','amber','rose','teal']);
 function icon(name='stack',tone='violet'){
  if(!tones.has(tone))tone='violet';if(!art[name]&&!paths[name])name='stack';
  const body=art[name]?`<img src="./icon-3d-${art[name]}.webp" width="32" height="32" decoding="async" alt="">`:`<svg viewBox="0 0 24 24" focusable="false">${paths[name]}</svg>`;
  return `<span class="cfs-icon cfs-icon-${tone}${art[name]?' cfs-icon-art':''}" aria-hidden="true">${body}</span>`;
 }
 root.ReviewIcons={icon};
 document.documentElement.classList.add('icons-intro');setTimeout(()=>document.documentElement.classList.remove('icons-intro'),4000);
 document.querySelectorAll('[data-icon3d]').forEach(node=>{const template=document.createElement('template');template.innerHTML=icon(node.dataset.icon3d,node.dataset.tone);node.replaceWith(template.content.firstElementChild);});
})(window);
