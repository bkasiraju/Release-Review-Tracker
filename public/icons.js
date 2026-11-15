/* Local, lightweight icons: four small WebP illustrations plus inline SVG actions. */
(function(root){
 'use strict';
 const art={scope:'open-source',risk:'deviation',monthly:'sla',ai:'automation'};
 const paths={
  missingUpdate:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M12 13v3"/><circle cx="12" cy="18" r=".5"/>',
  stack:'<rect x="4" y="4" width="16" height="5" rx="2"/><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 15h8M8 18h5"/>',
  health:'<path d="M3 12h4l2-6 4 12 2-6h6"/><circle cx="12" cy="12" r="10"/>',
  notstarted:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
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
  flag:'<path d="M6 20V4m0 1h11l-2 4 2 4H6"/>',
  bug:'<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M9 8a3 3 0 0 1 6 0M4 12h4m8 0h4M5 6l3 3m11-3-3 3M5 19l3-3m11 3-3-3"/>',
  rotation:'<path d="M20 12a8 8 0 0 1-14 5M4 12a8 8 0 0 1 14-5"/><path d="M18 3v4h-4M6 21v-4h4"/><circle cx="12" cy="12" r="2"/>',
  board:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M3 9h18M12 13h6M12 16h4"/>',
  plan:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M9 9v11M13 13h4M13 16.5h3"/>',
  td:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a3 3 0 0 1 3 3v6.5M14 13l3 3 3-3"/>',
  flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  sprint:'<path d="M4 20 20 4M14 4h6v6M4 12v8h8"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  notepad:'<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 2v4M15 2v4M8.500 10h7M8.500 14h7M8.500 17.500h4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>'
 };
 /* plan134: dimensional glyph tiles for the side bar (one per page). 48x48, own gradients, no 3D runtime. */
 const RT={home:['#8fa8ff','#4f5fe0','#33409f'],sprint:['#6fc2ff','#2c7fd8','#1f5a9e'],td:['#ffd36b','#e08a1e','#a35f10'],flask:['#ff9fb4','#d24a6b','#97304a'],trust:['#c4a2ff','#7a49dc','#53309c'],bug:['#ff8d8d','#d03545','#942431'],clock:['#ffdc7a','#e6992a','#a86a14'],review:['#74e0a8','#23a06c','#17724b'],plan:['#6fe0d8','#1f9d9a','#146e6c'],v2mom:['#e0a2ff','#a443d8','#722e98'],src:['#8fd6e8','#3593ad','#256a7e'],chron:['#ffb38a','#e0662a','#a3431a']};
 const RG={
  home:t=>'<path d="M24 9 7 24h5v14h10v-9h4v9h10V24h5z" fill="#fff"/><rect x="32" y="11" width="5" height="9" rx="1" fill="#e6ecff"/><rect x="21" y="29" width="6" height="9" rx="1" fill="'+t[1]+'" opacity=".55"/>',
  sprint:t=>'<path d="M24 7c6 4 8.5 11 7 19l-3.5 4h-7L17 26c-1.500-8 1-15 7-19z" fill="#fff"/><path d="M17 25.500 11.500 32l7-1.500zM31 25.500 36.500 32l-7-1.500z" fill="#d8e8ff"/><circle cx="24" cy="18" r="3.400" fill="'+t[1]+'"/><path d="M20.500 32.500q3.500 9 7 0z" fill="#ffb347"/><path d="M22.300 32.500q1.700 5 3.400 0z" fill="#fff3b0"/>',
  td:t=>'<path d="M24 14 12 33M24 14l12 19M14 36h20" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/><circle cx="24" cy="12" r="6" fill="#fff"/><circle cx="12" cy="35" r="6" fill="#fff"/><circle cx="36" cy="35" r="6" fill="#fff"/><circle cx="24" cy="12" r="2.200" fill="'+t[1]+'"/><circle cx="12" cy="35" r="2.200" fill="'+t[1]+'"/><circle cx="36" cy="35" r="2.200" fill="'+t[1]+'"/>',
  flask:t=>'<path d="M19 8h10v3h-1.500v9l8.500 14.500c1.700 3-.2 6-3.500 6H15.500c-3.300 0-5.200-3-3.500-6L20.500 20v-9H19z" fill="#fff"/><path d="M14.800 31h18.400l2.700 4.500c.6 1.100-.1 2.500-1.500 2.500H13.600c-1.400 0-2.100-1.400-1.500-2.500z" fill="#ffc2d0"/><circle cx="22" cy="33.500" r="1.800" fill="#fff"/><circle cx="28" cy="30" r="1.300" fill="#fff"/><path d="M33 9l1.400 2.800L37 13l-2.600 1.200L33 17l-1.400-2.800L29 13l2.600-1.200z" fill="#fff3b0"/>',
  trust:t=>'<path d="M24 7 11 12v11c0 8.500 5.500 14.500 13 18 7.500-3.500 13-9.500 13-18V12z" fill="#fff"/><path d="M24 11 14.500 14.800V23c0 6.200 3.800 10.800 9.500 13.800V11z" fill="#efe6ff"/><path d="M17 24l5 5 9-10" stroke="'+t[1]+'" stroke-width="3.800" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  bug:t=>'<path d="M12 22H6M12 30H6M36 22h6M36 30h6M14 14l5 5M34 14l-5 5M14 40l5-5M34 40l-5-5" stroke="#fff" stroke-width="2.800" stroke-linecap="round" fill="none"/><ellipse cx="24" cy="29" rx="9" ry="11.500" fill="#fff"/><circle cx="24" cy="15" r="5.500" fill="#fff"/><path d="M24 19v21" stroke="'+t[1]+'" stroke-width="2" opacity=".6"/><circle cx="21.500" cy="14" r="1.200" fill="'+t[1]+'"/><circle cx="26.500" cy="14" r="1.200" fill="'+t[1]+'"/>',
  clock:t=>'<rect x="11" y="7" width="26" height="4" rx="2" fill="#fff3d0"/><rect x="11" y="37" width="26" height="4" rx="2" fill="#fff3d0"/><path d="M14 11h20v3c0 5-5.500 7.500-7.500 10 2 2.500 7.500 5 7.500 10v3H14v-3c0-5 5.500-7.500 7.500-10C19.500 21.500 14 19 14 14z" fill="#fff" opacity=".92"/><path d="M18 14h12c-.5 3-3 4.500-6 6.500-3-2-5.500-3.500-6-6.500z" fill="#ffb81f"/><path d="M17.500 37c1-3.500 3.500-5.500 6.500-7 3 1.500 5.500 3.500 6.500 7z" fill="#ffb81f"/><path d="M24 20.500v8" stroke="#ffb81f" stroke-width="1.600"/>',
  review:t=>'<path d="M24 7 39 15v18L24 41 9 33V15z" fill="#d6f5e5"/><path d="M24 7 39 15 24 23 9 15z" fill="#fff"/><path d="M9 15l15 8v18L9 33z" fill="#b5ebd0"/><path d="M24 23l15-8v18L24 41z" fill="#8fdcb9"/><circle cx="36" cy="35" r="8.500" fill="#fff"/><circle cx="36" cy="35" r="6.500" fill="'+t[1]+'"/><path d="M32.500 35l2.600 2.600 4.600-5" stroke="#fff" stroke-width="2.400" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  plan:t=>'<rect x="8" y="10" width="32" height="30" rx="5" fill="#fff"/><path d="M8 15a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v4H8z" fill="#bff3ee"/><rect x="14" y="6" width="4" height="8" rx="2" fill="#fff"/><rect x="30" y="6" width="4" height="8" rx="2" fill="#fff"/><rect x="13" y="23" width="14" height="4.500" rx="2.250" fill="'+t[1]+'"/><rect x="20" y="30" width="16" height="4.500" rx="2.250" fill="#4cc9c0"/><rect x="13" y="30" width="4" height="4.500" rx="2" fill="#a3e8e2"/>',
  v2mom:t=>'<circle cx="23" cy="26" r="16" fill="#fff"/><circle cx="23" cy="26" r="11" fill="'+t[0]+'"/><circle cx="23" cy="26" r="6.500" fill="#fff"/><circle cx="23" cy="26" r="3" fill="'+t[2]+'"/><path d="M23 26 38 10" stroke="#3b1260" stroke-width="3" stroke-linecap="round"/><path d="M33 7l1 6 6 1-3.500-3.500z" fill="#3b1260"/>',
  chron:t=>'<path d="M13 8h22a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#fff"/><path d="M9 13a4 4 0 0 1 4-5h4v32h-4a4 4 0 0 1-4-4z" fill="#ffd9c4"/><path d="M24 14v20" stroke="'+t[1]+'" stroke-width="2.200" stroke-linecap="round" opacity=".55"/><circle cx="24" cy="15" r="3.200" fill="'+t[1]+'"/><circle cx="24" cy="24" r="3.200" fill="#ffb347"/><circle cx="24" cy="33" r="3.200" fill="'+t[1]+'"/><rect x="29" y="13" width="7" height="3.500" rx="1.750" fill="'+t[0]+'"/><rect x="29" y="22" width="5" height="3.500" rx="1.750" fill="#ffd9c4"/><rect x="29" y="31" width="7" height="3.500" rx="1.750" fill="'+t[0]+'"/>',
  src:t=>'<path d="M10 12v24c0 3.300 6.300 6 14 6s14-2.700 14-6V12z" fill="#fff"/><path d="M10 24c0 3.300 6.300 6 14 6s14-2.700 14-6M10 33c0 3.300 6.300 6 14 6s14-2.700 14-6" stroke="'+t[1]+'" stroke-width="2.200" fill="none" opacity=".55"/><ellipse cx="24" cy="12" rx="14" ry="6" fill="#e3f7fb"/><ellipse cx="24" cy="12" rx="8" ry="2.500" fill="'+t[1]+'" opacity=".35"/>'
 };
 function rail(name){const t=RT[name],id='rg-'+name;
  return `<span class="cfs-icon cfs-r" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect x="3" y="6" width="42" height="40" rx="12" fill="${t[2]}"/><rect x="3" y="3" width="42" height="40" rx="12" fill="url(#${id})"/><path d="M6 17C6 8 13 4 24 4s18 4 18 13c-6-5-12-6-18-6S12 12 6 17z" fill="url(#${id}g)"/><g style="filter:drop-shadow(0 1.500px 0 rgba(0,0,0,.28))" transform="translate(0 -1)">${RG[name](t)}</g></svg></span>`;}
 const tones=new Set(['violet','blue','green','amber','rose','teal']);
 function icon(name='stack',tone='violet'){
  if(RT[name]&&root.__railIcons)return rail(name);
  if(!tones.has(tone))tone='violet';if(!art[name]&&!paths[name])name='stack';
  const body=art[name]?`<img src="./icon-3d-${art[name]}.webp" width="32" height="32" decoding="async" alt="">`:`<svg viewBox="0 0 24 24" focusable="false">${paths[name]}</svg>`;
  return `<span class="cfs-icon cfs-icon-${tone}${art[name]?' cfs-icon-art':''}" aria-hidden="true">${body}</span>`;
 }
 root.ReviewIcons={icon};
 document.documentElement.classList.add('icons-intro');setTimeout(()=>document.documentElement.classList.remove('icons-intro'),4000);
 document.querySelectorAll('[data-icon3d]').forEach(node=>{const template=document.createElement('template');root.__railIcons=!!node.closest('.rail-button');template.innerHTML=icon(node.dataset.icon3d,node.dataset.tone);root.__railIcons=false;node.replaceWith(template.content.firstElementChild);});
})(window);
