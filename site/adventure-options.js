// Keys match the native Ship of Harkinian settings. A third field supplies select choices.
const cheatRules = {
  'Health and supplies': [
    ['InfiniteHealth','Infinite health'],['InfiniteMagic','Infinite magic'],['InfiniteAmmo','Infinite ammunition'],
    ['InfiniteMoney','Infinite rupees'],['InfiniteNayru','Continuous Nayru’s Love'],['InfiniteEponaBoost','Infinite horse boosts'],
    ['DropsDontDie','Keep dropped items from disappearing']
  ],
  'Movement and equipment': [
    ['MoonJumpOnL','Moon jump · hold L shoulder'],['NoClip','Walk through walls'],['ClimbEverything','Climb any wall'],
    ['HookshotEverything','Hookshot any surface'],['HookshotReachMultiplier','Hookshot reach',[[1,'Normal'],[2,'2×'],[4,'4×'],[8,'8×']]],
    ['TimelessEquipment','Ignore equipment age restrictions'],['NoRestrictItems','Use items in restricted areas'],
    ['SuperTunic','Heat and underwater protection'],['ShieldTwoHanded','Shield with a two-handed weapon'],
    ['DekuStick','Deku sticks',[[0,'Normal'],[1,'Unbreakable'],[2,'Always burning']]]
  ],
  'Enemies and world': [
    ['FreezeTime','Freeze the time of day'],['DisableSandstorm','Clear the sandstorm'],
    ['NoRedeadFreeze','Prevent ReDead paralysis'],['NoKeeseGuayTarget','Keese and Guays ignore Link'],
    ['GSTargetable','Target Gold Skulltulas'],['EasyISG','Easy infinite sword glitch'],['EasyQPA','Easy quick put-away glitch']
  ]
};
const comfortRules = {
  'Dialogue and pickups': [
    ['TextSpeed','Dialogue speed',[[1,'1×'],[2,'2×'],[3,'3×'],[4,'4×'],[5,'5×']]],
    ['SkipText','Hold B to advance text'],['BetterOwl','Default to ending owl conversations'],
    ['ResetNaviTimer','Reset Navi’s reminder timer on scene entry'],['SkulltulaFreeze','Auto-dismiss Skulltula token text'],
    ['FastChests','Quick chest openings'],['FasterRupeeAccumulator','Count rupees faster']
  ],
  'Travel and inventory': [
    ['FasterBlockPush','Push blocks faster'],['FasterHeavyBlockLift','Lift heavy blocks faster'],
    ['FasterBottleEmpty','Empty bottles faster'],['FastOcarinaPlayback','Shorten ocarina playback'],
    ['PauseWarp','Warp from learned songs on the quest screen'],['OpenAllHours','Keep shops open day and night'],
    ['NightGSAlwaysSpawn','Allow night Skulltulas in daylight'],['PersistentMasks','Remember equipped mask after saving'],
    ['DpadEquips','Equip items on the D-pad'],['BowArrowCycle','Cycle equipped arrow types'],['RebottleBlueFire','Recapture blue fire'],
    ['QuitFishingAtDoor','Quit fishing at the door']
  ],
  'Game fixes': [
    ['DekuNutUpgradeFix','Deku Nut upgrade after the saw trade'],['GCDoorsAfterFireFix','Open Goron City doors after Fire Temple'],
    ['FixBrokenGiantsKnife','Correct the broken Giant’s Knife equipment flag'],['FixFloorSwitches','Align two misplaced floor switches'],
    ['FixHammerHand','Correct Link’s hammer hand'],['TwoHandedIdle','Correct two-handed weapon idle animation'],
    ['SceneSpecificDirtPathFix','Reduce flicker on dirt paths']
  ]
};
// These are InventoryItem IDs, passed directly to Item_Give on the active PlayState.
const grantItems = {
  'Fairy Bow':0x03,'Fairy Slingshot':0x06,Boomerang:0x0e,Hookshot:0x0a,Longshot:0x0b,'Lens of Truth':0x0f,
  'Fairy Ocarina':0x07,'Ocarina of Time':0x08,'Megaton Hammer':0x11,'Magic bean':0x10,
  'Kokiri Sword':0x3b,'Master Sword':0x3c,'Giant’s Knife':0x3d,'Deku Shield':0x3e,'Hylian Shield':0x3f,'Mirror Shield':0x40,
  'Goron Tunic':0x42,'Zora Tunic':0x43,'Iron Boots':0x45,'Hover Boots':0x46,
  '40-arrow quiver':0x4b,'50-arrow quiver':0x4c,'20-bomb bag':0x4d,'30-bomb bag':0x4e,'40-bomb bag':0x4f,
  'Goron Bracelet':0x50,'Silver Gauntlets':0x51,'Golden Gauntlets':0x52,'Silver Scale':0x53,'Golden Scale':0x54,
  'Adult wallet':0x56,'Giant wallet':0x57,'Fire Arrows':0x04,'Ice Arrows':0x0c,'Light Arrows':0x12,
  'Din’s Fire':0x05,'Farore’s Wind':0x0d,'Nayru’s Love':0x13,'Stone of Agony':0x6f,'Gerudo card':0x70,'Gold Skulltula token':0x71,
  'Skull Mask':0x25,'Spooky Mask':0x26,'Keaton Mask':0x24,'Bunny Hood':0x27,'Mask of Truth':0x2b,'Goron Mask':0x28,'Zora Mask':0x29,'Gerudo Mask':0x2a,
  'Kokiri Emerald':0x6c,'Goron Ruby':0x6d,'Zora Sapphire':0x6e,'Forest Medallion':0x66,'Fire Medallion':0x67,
  'Water Medallion':0x68,'Spirit Medallion':0x69,'Shadow Medallion':0x6a,'Light Medallion':0x6b
};
const songs = {
  'Minuet of Forest':0x5a,'Bolero of Fire':0x5b,'Serenade of Water':0x5c,'Requiem of Spirit':0x5d,
  'Nocturne of Shadow':0x5e,'Prelude of Light':0x5f,'Zelda’s Lullaby':0x60,'Epona’s Song':0x61,
  'Saria’s Song':0x62,'Sun’s Song':0x63,'Song of Time':0x64,'Song of Storms':0x65
};
const warpDoors = {
  'Kokiri Forest':'00ee','Link’s house':'00bb','Kokiri Shop':'00c1','Hyrule Field':'00cd','Kakariko Village':'00db',
  Graveyard:'00e4','Lake Hylia':'0102','Zora’s Domain':'0108','Gerudo Valley':'0117','Death Mountain Trail':'013d',
  'Lon Lon Ranch':'0157','Temple of Time':'0053','Deku Tree':'0000','Dodongo’s Cavern':'0004','Jabu-Jabu':'0028',
  'Forest Temple':'0169','Fire Temple':'0165','Water Temple':'0010','Shadow Temple':'0037','Spirit Temple':'0082'
};
function createAdventureOptions({engine,prefs,persist,keyLabel}) {
  const fixes = comfortRules['Game fixes'];
  const isFloat = path => path==='gCheats.HookshotReachMultiplier';
  function set(path,value) {
    const api=engine(), name=Module.allocateUTF8(path), nativeName=Module._malloc(24);
    try {
      if(isFloat(path)) api.setFloat(name,value); else api.setInt(name,value);
      api.makeSettingName(nativeName,name);
      try { api.refreshSetting(nativeName); } finally { api.destroySettingName(nativeName); }
    } finally { Module._free(nativeName);Module._free(name); }
  }
  function read(path,fallback) {
    const api=engine(), name=Module.allocateUTF8(path);
    try {return isFloat(path)?api.getFloat(name,fallback):api.getInt(name,fallback)}
    finally { Module._free(name); }
  }
  function restore(){
    for(const [table,prefix] of [[comfortRules,'gEnhancements.'],[cheatRules,'gCheats.']]){
      for(const rows of Object.values(table))for(const [id,,choices] of rows){
        const path=prefix+id,value=prefs.gameOptions?.[path];
        if((choices||[[0],[1]]).some(([n])=>n===value)) set(path,value);
        else if(rows===fixes)set(path,1);
      }
    }
  }
  function draw(cheats,content,status,ready){
    content.replaceChildren();
    if(!ready){content.textContent='Loading game settings…';return}
    const desc=document.createElement('p');
    desc.textContent=cheats?'Switches are remembered in this browser. Item grants and warps affect the active game.':'These settings apply across game files in this browser. Game fixes start enabled.';
    const search=document.createElement('input');
    search.type='search';search.placeholder=cheats?'Find a cheat or item':'Find an option';search.setAttribute('aria-label',search.placeholder);
    search.className='option-search';
    content.append(desc,search);
    const tables=cheats?cheatRules:comfortRules,prefix=cheats?'gCheats.':'gEnhancements.';
    function group(label,first=false){
      const box=document.createElement('details'),summary=document.createElement('summary');
      summary.textContent=label;box.open=first;box.className='option-group';box.append(summary);content.append(box);return box;
    }
    function select(label,options){
      const s=document.createElement('select');s.setAttribute('aria-label',label);
      for(const [value,title] of options)s.add(new Option(title,value));
      return s;
    }
    for(const [title,rows] of Object.entries(tables)){
      const box=group(title,content.querySelector('details')===null);
      for(const [id,title,choices] of rows){
        let label=title;
        if(id==='MoonJumpOnL')label='Moon jump · hold '+keyLabel('KeyE');
        if(id==='SkipText')label='Hold '+keyLabel('KeyC')+' to advance text';
        const path=prefix+id,row=document.createElement('label');
        const control=choices?select(label,choices):document.createElement('input');
        if(choices)control.value=read(path,choices[0][0]);else{control.type='checkbox';control.checked=!!read(path,0)}
        control.dataset.setting=path;
        row.append(label,control);box.append(row);
        control.onchange=()=>{const v=choices?Number(control.value):Number(control.checked);set(path,v);
          (prefs.gameOptions ||= {})[path]=v;persist();status.textContent=label+' updated.'};
      }
    }
    function run(cmd,label){
      if(!engine()?.gameLoaded(1)){status.textContent='Open a game file first.';return}
      if(typeof cmd==='function'){cmd();status.textContent=label+' applied.';return}
      const p=Module.allocateUTF8(cmd);
      try{status.textContent=Module._web_console(p)===0 ? label+' applied.' : 'Unavailable in the current game state.'}
      finally{Module._free(p)}
    }
    function action(box,name,cmd){
      const b=document.createElement('button');b.textContent=name;b.onclick=()=>run(cmd,name);box.append(b);
    }
    function picker(box,name,options,command,verb){
      const row=document.createElement('div');row.className='cheat-picker';const s=select(name,Object.entries(options).map(([k,v])=>[v,k]));
      const b=document.createElement('button');b.textContent=verb;b.onclick=()=>run(command(s.value),s.selectedOptions[0].text);
      const label=document.createElement('label');label.append(name,s);row.append(label,b);box.append(row);
    }
    if(cheats){
      const supplies=group('Refills and equipment',true);
      for(const [l,c] of [['Refill hearts','heal 20'],['Refill magic','fill_magic'],['Empty magic','empty_magic'],['Add heart container','add_heart_container'],['Remove heart container','remove_heart_container'],['Set wallet to 99 rupees','rupee 99']])action(supplies,l,c);
      const grant=id=>()=>{const api=engine();api.giveInventoryItem(HEAPU32[api.playStateAddress.value>>>2],Number(id))};
      picker(supplies,'Grant item',grantItems,grant,'Give item');
      picker(supplies,'Learn song',songs,grant,'Learn song');
      const ammo=document.createElement('div');ammo.className='cheat-picker';
      const kind=select('Supply',[[0,'Deku sticks'],[1,'Deku nuts'],[2,'Bombs'],[6,'Deku seeds'],[3,'Arrows'],[9,'Bombchus'],[16,'Magic beans']]);
      const amount=document.createElement('input');amount.type='number';amount.min='1';amount.max='999';amount.step='1';amount.value='10';amount.setAttribute('aria-label','Amount');
      const choice=document.createElement('label');choice.append('Give supplies',kind);
      const count=document.createElement('label');count.append('Amount',amount);
      const give=document.createElement('button');give.textContent='Give';
      give.onclick=()=>{
        if(!amount.reportValidity())return;
        const value=Number(amount.value);if(!Number.isInteger(value))return;
        run(()=>{const api=engine(),item=Number(kind.value),address=api.ammoAddress.value+HEAPU8[api.itemSlotsAddress.value+item],before=Math.max(0,HEAP8[address]);api.giveInventoryItem(HEAPU32[api.playStateAddress.value>>>2],item);HEAP8[address]=before;api.changeAmmo(item,Math.max(0,Math.min(value,(item===16?10:99)-before)));},kind.selectedOptions[0].text);
        status.textContent+=' Inventory capacity applies.';
      };
      ammo.append(choice,count,give);supplies.append(ammo);
      picker(supplies,'Rupee counter',{'0 rupees':0,'99 rupees':99,'200 rupees':200,'500 rupees':500},v=>'rupee '+v,'Set rupees');
      picker(supplies,'Wear boots',{Kokiri:'kokiri',Iron:'iron',Hover:'hover'},v=>'boots '+v,'Equip');
      const bottles=group('Bottle contents');
      const bottle=select('Bottle slot',[1,2,3,4].map(n=>[n,'Bottle '+n]));
      const bl=document.createElement('label');bl.append('Replace contents of',bottle);bottles.append(bl);
      picker(bottles,'Contents',{'Red potion':'red_potion','Green potion':'green_potion','Blue potion':'blue_potion',Fairy:'fairy',Milk:'milk',Fish:'fish',Bugs:'bugs','Blue fire':'blue_fire',Poe:'poe','Big Poe':'big_poe','Ruto’s letter':'rutos_letter'},v=>'bottle '+v+' '+bottle.value,'Fill bottle');
      const travel=group('Warps and world effects');
      picker(travel,'Destination',warpDoors,v=>'entrance '+v,'Warp');
      picker(travel,'Spawn beside Link',{Cucco:'25 0',Keese:'19 2',Dodongo:'18 0',Stalfos:'2 0','Red Tektite':'27 -1','Deku Baba':'85 0',Shabom:'45 0',Floormaster:'142 0'},v=>'spawn '+v,'Spawn');
      for(const [l,c] of [['Reload this area','reload'],['Return to respawn point','void'],['Start rainstorm','rainstorm'],['Summon Cucco storm','cucco_storm']])action(travel,l,c);
      const effects=group('Link and challenge modes');
      picker(effects,'Appearance',{'Normal size':'giant_link 0','Giant Link':'giant_link 1','Minish Link':'minish_link 1','Paper Link':'paper_link 1','Invisible':'invisible 1','Visible':'invisible 0'},v=>v,'Apply appearance');
      picker(effects,'Gravity',{Light:0,Normal:1,Heavy:2},v=>'gravity '+v,'Apply gravity');
      for(const [name,command] of [['One-hit KO','ohko'],['Pacifist mode','pacifist'],['Reverse controls','reverse_controls'],['Disable targeting','no_z'],['Hide game HUD','no_ui']])
        picker(effects,name,{On:1,Off:0},v=>command+' '+v,'Apply');
      for(const [l,c] of [['Freeze Link','freeze'],['Burn Link','burn'],['Shock Link','electrocute'],['Lose one heart','damage 1'],['Knock Link back','knockback 1']])action(effects,l,c);
    }
    const boxes=[...content.querySelectorAll('details')];
    const empty=document.createElement('p');empty.hidden=true;empty.textContent='No matching options.';content.append(empty);
    const previous=new Map();
    search.oninput=()=>{
      const term=search.value.trim().toLowerCase();
      for(const box of boxes){
        if(term&&!previous.has(box))previous.set(box,box.open);
        const all=box.querySelector('summary').textContent.toLowerCase().includes(term);
        for(const row of [...box.children].slice(1)){
          row.hidden=!(all||row.textContent.toLowerCase().includes(term));
          if(!term||all||row.hidden||!row.matches('.cheat-picker'))continue;
          const choices=row.querySelector('select');
          if(!choices.selectedOptions[0].text.toLowerCase().includes(term)){
            const match=[...choices.options].find(o=>o.text.toLowerCase().includes(term));
            if(match)choices.value=match.value;
          }
        }
        box.hidden=![...box.children].slice(1).some(row=>!row.hidden);
        if(term)box.open=!box.hidden;else if(previous.has(box)){box.open=previous.get(box);previous.delete(box)}
      }
      empty.hidden=boxes.some(box=>!box.hidden);
    };
  }
  return {restore,draw,set,read};
}
