(function() {
    'use strict';

    const AudioEngine = {
      ctx: null,
      sfxEnabled: true,
      bgmEnabled: false,
      bgmTimer: null,
      bgmStep: 0,

      ensure() {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      },

      tone(freq, dur, type = 'square', vol = 0.07, delay = 0, slideTo = null) {
        if (!this.sfxEnabled) return;
        this.ensure();
        if (!this.ctx) return;
        const t0 = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.01);
      },

      noise(dur, vol = 0.06, delay = 0) {
        if (!this.sfxEnabled) return;
        this.ensure();
        if (!this.ctx) return;
        const sr = this.ctx.sampleRate;
        const len = Math.floor(sr * dur);
        const buf = this.ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        const t0 = this.ctx.currentTime + delay;
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(t0);
      },

      playBlip() { this.tone(660, 0.045, 'square', 0.05); },
      playConfirm() {
        this.tone(587, 0.05, 'square', 0.06, 0);
        this.tone(880, 0.08, 'square', 0.06, 0.045);
      },
      playCancel() { this.tone(380, 0.07, 'square', 0.05, 0, 220); },
      playBump() { this.tone(130, 0.08, 'triangle', 0.08); },
      playStep() { this.noise(0.025, 0.02); },
      playEncounter() {
        [330, 392, 494, 659, 587, 784, 988].forEach((n, i) => this.tone(n, 0.065, 'square', 0.07, i * 0.055));
      },
      playAttack(moveType) {
        if (moveType === 'Fire') {
          this.noise(0.24, 0.08, 0);
          this.tone(280, 0.22, 'sawtooth', 0.06, 0, 110);
        } else if (moveType === 'Electric') {
          this.tone(980, 0.06, 'square', 0.07, 0, 420);
          this.tone(1240, 0.08, 'square', 0.07, 0.06, 300);
          this.noise(0.1, 0.05, 0.12);
        } else if (moveType === 'Water') {
          this.tone(420, 0.08, 'sine', 0.08, 0, 720);
          this.tone(520, 0.1, 'sine', 0.08, 0.08, 860);
        } else if (moveType === 'Grass') {
          this.noise(0.09, 0.06, 0);
          this.tone(620, 0.1, 'triangle', 0.07, 0.03, 920);
        } else if (moveType === 'Rock') {
          this.noise(0.18, 0.09, 0);
          this.tone(140, 0.18, 'square', 0.08, 0, 65);
        } else if (moveType === 'Ghost') {
          this.tone(310, 0.14, 'sine', 0.08, 0, 190);
          this.tone(260, 0.16, 'triangle', 0.07, 0.1, 430);
        } else {
          this.noise(0.09, 0.08, 0);
          this.tone(240, 0.09, 'square', 0.07, 0, 110);
        }
      },
      playHeal() {
        [[587.3, 0.14, 0], [587.3, 0.14, 0.16], [587.3, 0.12, 0.32], [493.9, 0.14, 0.46], [784.0, 0.32, 0.62]]
          .forEach(([f, d, t]) => this.tone(f, d, 'triangle', 0.09, t));
      },
      playBallThrow() { this.tone(360, 0.18, 'sine', 0.07, 0, 880); },
      playBallShake() { this.tone(280, 0.07, 'triangle', 0.07, 0, 390); },
      playCatchSuccess() {
        [[523.3, 0.10, 0], [659.3, 0.10, 0.11], [784.0, 0.10, 0.22], [1046.5, 0.34, 0.34]]
          .forEach(([f, d, t]) => this.tone(f, d, 'square', 0.07, t));
      },
      playLevelUp() {
        [[440, 0.08, 0], [554, 0.08, 0.08], [659, 0.08, 0.16], [880, 0.25, 0.25]]
          .forEach(([f, d, t]) => this.tone(f, d, 'square', 0.07, t));
      },
      playVictory() {
        [[523, 0.11, 0], [523, 0.11, 0.12], [523, 0.11, 0.24], [523, 0.26, 0.36],
         [415, 0.24, 0.64], [466, 0.24, 0.90], [523, 0.16, 1.16], [466, 0.10, 1.35], [523, 0.45, 1.47]]
          .forEach(([f, d, t]) => this.tone(f, d, 'square', 0.07, t));
      },

      toggleBgm(on) {
        this.bgmEnabled = on;
        if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
        if (on) {
          this.ensure();
          const melody = [392, 440, 494, 587, 523, 494, 440, 392, 330, 392, 440, 523, 494, 440, 392, 330];
          this.bgmTimer = setInterval(() => {
            if (!this.bgmEnabled || !this.ctx) return;
            const freq = melody[this.bgmStep++ % melody.length];
            const t0 = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t0);
            g.gain.setValueAtTime(0.025, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.21);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.22);
          }, 240);
        }
      }
    };

    const SPRITES = {
      bulbasaur: {
        pal: { k:'#172026', g:'#36a852', l:'#6ce079', t:'#45b5a8', d:'#2c7d75', r:'#d93848', w:'#ffffff' },
        rows: [
          '......kkkk......','....kkggggkk....','...kggllllggk...','..kggllggllggk..',
          '..kggggggggggk..','.kkttttkkkkttkk.','ktttttkggggktttk','kttwktkggggktwtk',
          'kttrkttttttttrtk','kttttttttttttttk','.kttttdkkkdtttk.','.kttddk...kddtk.',
          '..kttk.....kttk.','..kkkk.....kkkk.','................','................'
        ]
      },
      ivysaur: {
        pal: { k:'#172026', p:'#e84c7a', f:'#ff85a8', g:'#2ca352', t:'#389c9c', d:'#246e70', r:'#d93848', w:'#ffffff' },
        rows: [
          '.....kkkkkk.....','...kkppffppkk...','..kppffffffppk..','.kggggppppggggk.',
          'kggkggggggggkggk','.kkttttkkkkttkk.','ktttttkggggktttk','kttwktkggggktwtk',
          'kttrkttttttttrtk','kttttttttttttttk','kttttddkkkkddttk','.kttddk....kddtk',
          '.ktttk......kttk','..kkkk......kkkk','................','................'
        ]
      },
      charmander: {
        pal: { k:'#1a1817', o:'#f27424', l:'#ffa64d', c:'#ffe38f', r:'#e63229', y:'#ffdd33', w:'#ffffff' },
        rows: [
          '.....kkkkk......','....koooook.....','...koolllook....','...kowkokook....',
          '...kookooook..k.','....koooook..krk','...kkoooookk.kyk','..koolccclookkrk',
          '..koolccclookok.','...kocccccokook.','...koocccooook..','...koook.koook..',
          '...kook...kook..','...kkkk...kkkk..','................','................'
        ]
      },
      charmeleon: {
        pal: { k:'#1a1817', o:'#de3a28', l:'#f56342', c:'#ffe08c', r:'#ff2a1f', y:'#ffe842', w:'#ffffff' },
        rows: [
          '....kkk.........','...koookkk......','..koollloook....','..kowkokoook..k.',
          '...koooooook.krk','..kkooooook..kyk','.koolcccclok.krk','.koolcccclookok.',
          '..koccccccoook..','..kooccccooook..','..kooook.koook..','..koook...kook..',
          '..kkkk....kkkk..','................','................','................'
        ]
      },
      squirtle: {
        pal: { k:'#172029', b:'#4ca9e8', l:'#8ad1ff', s:'#b86d2e', y:'#f2dc91', w:'#ffffff' },
        rows: [
          '.....kkkkk......','....kbbbbbk.....','...kbbllbbbk....','...kbwkbkbbk....',
          '...kbbbbbbbk....','....kbbbbbkk....','..kkbyyyyybkk...','.kbbbyyyyybsbk..',
          '.kbbbyyyyyssbk..','..kkbyyyyysskk..','...kbbkkkkbbk.kk','...kbbk..kbbkkbk',
          '...kkkk..kkkkkk.','................','................','................'
        ]
      },
      wartortle: {
        pal: { k:'#172029', b:'#3d78d9', f:'#dceaff', s:'#9e5722', y:'#ebd286', w:'#ffffff' },
        rows: [
          '..kk.......kk...','.kffk.kkkkkffk..','.kffkkbbbbbkfk..','..kfkbbbwkbbk...',
          '...kkbbbbbbbk.kk','..kkbyyyyybskkfk','.kbbbyyyyyssbkfk','.kbbbyyyyyssbkk.',
          '..kkbyyyyysskk..','...kbbkkkkbbk...','...kbbk..kbbk...','...kkkk..kkkk...',
          '................','................','................','................'
        ]
      },
      pikachu: {
        pal: { k:'#1c1a14', y:'#ffd924', s:'#d9a814', r:'#f03a2f', w:'#ffffff' },
        rows: [
          '.kk..........kk.','.kyk........kyk.','..kyk.kkkk.kyk..','..kykyyyyyykyk..',
          '...kyyyyyyyyyk..','...kywkyykywyk.k','...kyryyyykrykky','....kyyyyyyykkyk',
          '...kyyyyyyyyykk.','...kyysyyysyyk..','...kyyyyyyyyyk..','....kyyk..kyyk..',
          '....kkkk..kkkk..','................','................','................'
        ]
      },
      raichu: {
        pal: { k:'#1c1a14', o:'#f08826', y:'#ffe047', c:'#fff3ba', b:'#6b3c18', r:'#ff9e26', w:'#ffffff' },
        rows: [
          '.kk..........kk.','kbyk..kkkk..kybk','.kbykkoooookybk.','..kkkooooookkk..',
          '...koowkookook..','...koorooorook.k','..kkooooooookkyk','.koocccccccooky.',
          '.koocccccccook..','..koocccccook...','...kooookoook...','...kbbbk.kbbbk..',
          '...kkkk..kkkk...','................','................','................'
        ]
      },
      pidgey: {
        pal: { k:'#1f1914', b:'#a86d3b', l:'#d49c63', c:'#f7e6bd', y:'#f2bd29', w:'#ffffff' },
        rows: [
          '.....kkkkk......','....kbbbbbk.....','...kbblllbbk....','...kbwkccbbk....',
          '...kyykcccck....','....kkcccccbbk..','...kbbcccccbbbk.','..kbbbccccclbbbk',
          '..kbbbcccccbbbbk','...kkbcccccbkkk.','.....kccccck....','.....kyk.kyk....',
          '....kkk..kkk....','................','................','................'
        ]
      },
      eevee: {
        pal: { k:'#1f1712', b:'#b5733a', l:'#d99757', c:'#fff0cc', w:'#ffffff' },
        rows: [
          '.kk..........kk.','.kbbk......kbbk.','..kbbkkkkkkbbk..','...kbbbbbbbbk...',
          '...kbwkbbkwbk...','...kbbbbbbbbk...','..kkcccccccckk..','.kcccccccccccck.',
          '..kkcccccccckkbk','...kbbbbbbbbkbbk','...kbbk..kbbkk..','...kkkk..kkkk...',
          '................','................','................','................'
        ]
      },
      vulpix: {
        pal: { k:'#1f1512', o:'#d95a32', l:'#fa8455', c:'#ffd2a6', w:'#ffffff' },
        rows: [
          '..kk...kkk...kk.','.kook.klllk.kook','..kooklllllkook.','...kooooooooook.',
          '...kowkookowok..','....kooooooookkk','...koooooooooklk','...kooccccoooklk',
          '...kooooooooookk','...koook..koook.','...kook....kook.','...kkkk....kkkk.',
          '................','................','................','................'
        ]
      },
      poliwag: {
        pal: { k:'#151c29', b:'#4379db', w:'#ffffff', p:'#f28ca6' },
        rows: [
          '.....kkkkkk.....','...kkbbbbbbkk...','..kbbbbbbbbbbk..','.kbbwkbbbbkwbbk.',
          '.kbbbbppppbbbbk.','.kbbwwwwwwwwbbk.','.kbbwkkkkkkwbbk.','.kbbwkwwwwkwbbk.',
          '.kbbwwkkkkwwbbk.','..kbbwwwwwwbbk..','...kkbbbbbbkk.kk','....kbbk.kbbkkwk',
          '....kkk..kkkkkk.','................','................','................'
        ]
      },
      gastly: {
        pal: { k:'#140d1f', p:'#7c42b8', d:'#331b4f', l:'#b87ef2', w:'#ffffff', r:'#f04864' },
        rows: [
          '...ll..pppp..ll.','..lppkkkkkkppl..','.lpkkddddddkkpl.','.pkddddddddddkp.',
          'pkddwwwddwwwddkp','pkddwwkddkwwddkp','pkddwwwddwwwddkp','pkdddddddddddkp.',
          'pkddkrrrrrrkddkp','.pkddkwwwwkddkp.','.lpkkddddddkkpl.','..ll.kkkkkk..ll.',
          '....ll....ll....','................','................','................'
        ]
      },
      gengar: {
        pal: { k:'#140d1f', p:'#6838a8', l:'#8c58cf', r:'#f23047', w:'#ffffff' },
        rows: [
          '.kk..kk..kk..kk.','.kpk.kpkkpk.kpk.','..kppppppppppk..','.kpppllpppllppk.',
          '.kpprrkppkrrppk.','kppprrrpprrrpppk','kppppppppppppppk','kppkwwwwwwwwkppk',
          'kppkwkwkwkwkwppk','.kppkkkkkkkkppk.','.kppppppppppppk.','..kpppk..kpppk..',
          '..kkkk....kkkk..','................','................','................'
        ]
      },
      geodude: {
        pal: { k:'#1c1c1c', g:'#8c8881', l:'#b8b3aa', d:'#5e5b56', w:'#ffffff' },
        rows: [
          '................','.....kkkkkk.....','....kggggggk....','kk.kgllgggggk.kk',
          'kgkkggwkggkwgkkg','kggkggggggggkggk','kggkggddddggkggk','.kk.kggggggk.kk.',
          '.....kkkkkk.....','................','................','................',
          '................','................','................','................'
        ]
      },
      onix: {
        pal: { k:'#1a1a1c', g:'#7e8287', l:'#aeb3b8', d:'#525559', w:'#ffffff' },
        rows: [
          '.......kk.......','......kggk......','....kkggggkk....','...kgllgggggk...',
          '...kgwkggkwgk...','....kggggggk....','..kkddddddddkk..','.kggllggggddggk.',
          '.kggggggkkggggk.','..kkkkkk..kgggk.','.........kggggk.','........kggddk..',
          '.......kgggk....','.......kkkk.....','................','................'
        ]
      },
      playerDown: {
        pal: { k:'#17181f', r:'#e03131', w:'#ffffff', s:'#ffcc9e', b:'#2b5fd9', d:'#382a22' },
        rows: [
          '....kkkkkkkk....','...krrrrrrrrk...','..krrwwwwwwrrk..','..kssssssssssk..',
          '..ksskswwskssk..','...kssssssssk...','...kkbbbbbbkk...','..krrbbbbbbbrk..',
          '..kssbbbbbbssk..','...kkbbbbbbkk...','....kbbkkbbk....','....kddkkddk....',
          '....kkkkkkkk....','................','................','................'
        ]
      },
      playerUp: {
        pal: { k:'#17181f', r:'#e03131', s:'#ffcc9e', b:'#2b5fd9', d:'#382a22' },
        rows: [
          '....kkkkkkkk....','...krrrrrrrrk...','..krrrrrrrrrrk..','..kddddddddddk..',
          '..ksddddddddsk..','...kkkkkkkkkk...','...kkbbbbbbkk...','..krrbbbbbbbrk..',
          '..kssbbbbbbssk..','...kkbbbbbbkk...','....kbbkkbbk....','....kddkkddk....',
          '....kkkkkkkk....','................','................','................'
        ]
      },
      playerSide: {
        pal: { k:'#17181f', r:'#e03131', w:'#ffffff', s:'#ffcc9e', b:'#2b5fd9', d:'#382a22' },
        rows: [
          '....kkkkkkk.....','...krrrrrrrk....','..krrrrrrrwwk...','..kddddsssssk...',
          '...kddssskssk...','....kssssssk....','....kbbbbbbk....','...krrbbbbbk....',
          '...kssbbbbbk....','....kbbbbbbk....','....kbbkkbbk....','....kddkkddk....',
          '....kkkkkkkk....','................','................','................'
        ]
      },
      npcNurse: {
        pal: { k:'#1c1821', p:'#f27ca6', w:'#ffffff', s:'#ffd4b0', r:'#e63946', b:'#2b5fd9' },
        rows: [
          '....kkkkkkkk....','...kppppppppk...','..kppwwrrwwppk..','..kppksssskppk..',
          '..kppsksbskppk..','...kssssssssk...','...kkwwwwwwkk...','..kppwwwwwwppk..',
          '..ksswwwwwwssk..','...kkwwwwwwkk...','....kwwkkwwk....','....kppkkppk....',
          '....kkkkkkkk....','................','................','................'
        ]
      },
      npcBrock: {
        pal: { k:'#171412', h:'#3b281c', s:'#d49a6a', g:'#596e37', o:'#d96b27', b:'#5e4736' },
        rows: [
          '...kk..kk..kk...','..khhkkhhkkhhk..','..khhhhhhhhhhk..','..kssssssssssk..',
          '..kskkksskkksk..','...kssssssssk...','..kkgggooggkk...','.kssgggooggssk..',
          '.kssgggooggssk..','..kkbbbbbbbbkk..','....kbbkkbbk....','....khhkkhhk....',
          '....kkkkkkkk....','................','................','................'
        ]
      },
      npcTrainer: {
        pal: { k:'#17181f', y:'#f0c429', b:'#3875d6', s:'#ffd2a6', d:'#473325', w:'#ffffff' },
        rows: [
          '....kkkkkkkk....','...kyyyyyyyyk...','..kyyyyyyyyyyk..','..kssssssssssk..',
          '..ksskswwskssk..','...kssssssssk...','...kkbbbbbbkk...','..kssbbbbbbssk..',
          '...kkbbbbbbkk...','....kddkkddk....','....kkkkkkkk....','................',
          '................','................','................','................'
        ]
      }
    };

    function drawPixelSprite(ctx, key, x, y, scale = 2, flipX = false, whiteFlash = false) {
      const sp = SPRITES[key];
      if (!sp) return;
      const rows = sp.rows;
      const pal = sp.pal;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
          const ch = row[c];
          if (ch === '.' || !pal[ch]) continue;
          ctx.fillStyle = whiteFlash ? '#ffffff' : pal[ch];
          const drawCol = flipX ? (row.length - 1 - c) : c;
          ctx.fillRect(Math.floor(x + drawCol * scale), Math.floor(y + r * scale), Math.ceil(scale), Math.ceil(scale));
        }
      }
    }

    const TYPE_COLORS = {
      Grass: '#38a852', Fire: '#eb5e28', Water: '#3b88eb', Electric: '#e0b012',
      Rock: '#8f7d62', Flying: '#6d8fe8', Ghost: '#7b49b8', Normal: '#848894'
    };

    const TYPE_CHART = {
      Fire:     { Grass: 2.0, Water: 0.5, Fire: 0.5, Rock: 0.5 },
      Water:    { Fire: 2.0, Rock: 2.0, Water: 0.5, Grass: 0.5 },
      Grass:    { Water: 2.0, Rock: 2.0, Fire: 0.5, Grass: 0.5, Flying: 0.5 },
      Electric: { Water: 2.0, Flying: 2.0, Grass: 0.5, Electric: 0.5, Rock: 0.5 },
      Rock:     { Fire: 2.0, Flying: 2.0, Rock: 0.5 },
      Flying:   { Grass: 2.0, Rock: 0.5, Electric: 0.5 },
      Ghost:    { Ghost: 2.0, Normal: 0.5 },
      Normal:   { Rock: 0.5, Ghost: 0.25 }
    };

    function getEffectiveness(moveType, defType) {
      return (TYPE_CHART[moveType] && TYPE_CHART[moveType][defType] !== undefined)
        ? TYPE_CHART[moveType][defType]
        : 1.0;
    }

    const MOVES = {
      tackle:       { name: 'Tackle',       type: 'Normal',   power: 40, acc: 100, pp: 35 },
      quickAttack:  { name: 'Quick Attack', type: 'Normal',   power: 45, acc: 100, pp: 30, prio: 1 },
      swift:        { name: 'Swift',        type: 'Normal',   power: 60, acc: 100, pp: 20 },
      vineWhip:     { name: 'Vine Whip',    type: 'Grass',    power: 45, acc: 100, pp: 25 },
      razorLeaf:    { name: 'Razor Leaf',   type: 'Grass',    power: 60, acc: 95,  pp: 20 },
      leechSeed:    { name: 'Mega Drain',   type: 'Grass',    power: 50, acc: 100, pp: 15, drain: true },
      ember:        { name: 'Ember',        type: 'Fire',     power: 45, acc: 100, pp: 25 },
      flameWheel:   { name: 'Flame Burst',  type: 'Fire',     power: 65, acc: 95,  pp: 15 },
      waterGun:     { name: 'Water Gun',    type: 'Water',    power: 45, acc: 100, pp: 25 },
      bubbleBeam:   { name: 'Bubble Beam',  type: 'Water',    power: 65, acc: 100, pp: 20 },
      thunderShock: { name: 'ThunderShock', type: 'Electric', power: 45, acc: 100, pp: 30 },
      thunderbolt:  { name: 'Thunderbolt',  type: 'Electric', power: 75, acc: 100, pp: 15 },
      gust:         { name: 'Gust',         type: 'Flying',   power: 45, acc: 100, pp: 30 },
      wingAttack:   { name: 'Wing Attack',  type: 'Flying',   power: 60, acc: 100, pp: 20 },
      rockThrow:    { name: 'Rock Throw',   type: 'Rock',     power: 50, acc: 95,  pp: 20 },
      rockTomb:     { name: 'Rock Slide',   type: 'Rock',     power: 70, acc: 90,  pp: 15 },
      lick:         { name: 'Night Shade',  type: 'Ghost',    power: 50, acc: 100, pp: 20 },
      shadowBall:   { name: 'Shadow Ball',  type: 'Ghost',    power: 75, acc: 100, pp: 15 },
      growl:        { name: 'Growl',        type: 'Normal',   power: 0,  acc: 100, pp: 30, debuff: 'atk' }
    };

    const DEX_ORDER = [
      'bulbasaur', 'ivysaur', 'charmander', 'charmeleon',
      'squirtle', 'wartortle', 'pikachu', 'raichu',
      'pidgey', 'eevee', 'vulpix', 'poliwag',
      'gastly', 'gengar', 'geodude', 'onix'
    ];

    const SPECIES = {
      bulbasaur:  { name: 'Bulbasaur',  type: 'Grass',    hp: 46, atk: 50, def: 50, spd: 45, moves: ['tackle', 'vineWhip', 'leechSeed', 'razorLeaf'], evolveLvl: 8, evolveTo: 'ivysaur' },
      ivysaur:    { name: 'Ivysaur',    type: 'Grass',    hp: 62, atk: 65, def: 65, spd: 60, moves: ['tackle', 'vineWhip', 'leechSeed', 'razorLeaf'] },
      charmander: { name: 'Charmander', type: 'Fire',     hp: 42, atk: 55, def: 44, spd: 65, moves: ['tackle', 'ember', 'quickAttack', 'flameWheel'], evolveLvl: 8, evolveTo: 'charmeleon' },
      charmeleon: { name: 'Charmeleon', type: 'Fire',     hp: 60, atk: 72, def: 58, spd: 80, moves: ['quickAttack', 'ember', 'swift', 'flameWheel'] },
      squirtle:   { name: 'Squirtle',   type: 'Water',    hp: 45, atk: 49, def: 64, spd: 44, moves: ['tackle', 'waterGun', 'growl', 'bubbleBeam'], evolveLvl: 8, evolveTo: 'wartortle' },
      wartortle:  { name: 'Wartortle',  type: 'Water',    hp: 61, atk: 65, def: 80, spd: 58, moves: ['tackle', 'waterGun', 'swift', 'bubbleBeam'] },
      pikachu:    { name: 'Pikachu',    type: 'Electric', hp: 40, atk: 58, def: 42, spd: 90, moves: ['quickAttack', 'thunderShock', 'growl', 'thunderbolt'], evolveLvl: 8, evolveTo: 'raichu' },
      raichu:     { name: 'Raichu',     type: 'Electric', hp: 62, atk: 82, def: 56, spd: 105, moves: ['quickAttack', 'thunderShock', 'swift', 'thunderbolt'] },
      pidgey:     { name: 'Pidgey',     type: 'Flying',   hp: 42, atk: 46, def: 42, spd: 58, moves: ['tackle', 'gust', 'quickAttack', 'wingAttack'] },
      eevee:      { name: 'Eevee',      type: 'Normal',   hp: 52, atk: 56, def: 52, spd: 58, moves: ['tackle', 'quickAttack', 'growl', 'swift'] },
      vulpix:     { name: 'Vulpix',     type: 'Fire',     hp: 42, atk: 48, def: 45, spd: 65, moves: ['quickAttack', 'ember', 'growl', 'flameWheel'] },
      poliwag:    { name: 'Poliwag',    type: 'Water',    hp: 44, atk: 50, def: 44, spd: 75, moves: ['tackle', 'waterGun', 'growl', 'bubbleBeam'] },
      gastly:     { name: 'Gastly',     type: 'Ghost',    hp: 38, atk: 70, def: 38, spd: 80, moves: ['lick', 'quickAttack', 'growl', 'shadowBall'], evolveLvl: 9, evolveTo: 'gengar' },
      gengar:     { name: 'Gengar',     type: 'Ghost',    hp: 62, atk: 92, def: 60, spd: 105, moves: ['lick', 'swift', 'quickAttack', 'shadowBall'] },
      geodude:    { name: 'Geodude',    type: 'Rock',     hp: 44, atk: 68, def: 86, spd: 28, moves: ['tackle', 'rockThrow', 'growl', 'rockTomb'] },
      onix:       { name: 'Onix',       type: 'Rock',     hp: 54, atk: 62, def: 115, spd: 70, moves: ['tackle', 'rockThrow', 'growl', 'rockTomb'] }
    };

    let uidCounter = 1;
    function createPokemon(speciesKey, level) {
      const base = SPECIES[speciesKey];
      const maxHp = Math.floor(14 + level * 2.4 + (base.hp * level) / 28);
      const atk   = Math.floor(6 + (base.atk * level) / 26);
      const def   = Math.floor(6 + (base.def * level) / 26);
      const spd   = Math.floor(6 + (base.spd * level) / 26);
      const moveCount = level >= 6 ? 4 : 3;
      const moveList = base.moves.slice(0, moveCount).map(mKey => ({
        key: mKey, pp: MOVES[mKey].pp, maxPp: MOVES[mKey].pp
      }));
      return {
        uid: 'pkm-' + (uidCounter++),
        species: speciesKey,
        name: base.name,
        type: base.type,
        level,
        hp: maxHp,
        maxHp,
        atk,
        def,
        spd,
        xp: 0,
        nextXp: level * 22,
        moves: moveList
      };
    }

    function recalcStats(pkm, healDelta = true) {
      const base = SPECIES[pkm.species];
      pkm.name = base.name;
      pkm.type = base.type;
      const oldMax = pkm.maxHp;
      pkm.maxHp = Math.floor(14 + pkm.level * 2.4 + (base.hp * pkm.level) / 28);
      pkm.atk   = Math.floor(6 + (base.atk * pkm.level) / 26);
      pkm.def   = Math.floor(6 + (base.def * pkm.level) / 26);
      pkm.spd   = Math.floor(6 + (base.spd * pkm.level) / 26);
      pkm.nextXp = pkm.level * 22;
      if (healDelta && pkm.hp > 0) {
        pkm.hp = Math.min(pkm.maxHp, pkm.hp + Math.max(2, pkm.maxHp - oldMax));
      }
      if (pkm.level >= 6 && pkm.moves.length < 4 && base.moves[3]) {
        const mKey = base.moves[3];
        if (!pkm.moves.some(m => m.key === mKey)) {
          pkm.moves.push({ key: mKey, pp: MOVES[mKey].pp, maxPp: MOVES[mKey].pp });
        }
      }
    }

    const OVERWORLD_ROWS = [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TGGGGGG..TTTT....MMMMMMYYYYT',
      'TGGGGGG..f..T..M.QQQQQMYYYYT',
      'TGG..GG.....,..M.QQQQQMWWWWT',
      'T....,,S,,,,,,S,,QQ..QMWWEWT',
      'T..f.,,.....,........,,..,.T',
      'T,,,,.,..~~~~~,......,,,,,.T',
      'T,CCC.,..~~~~~,......,.....T',
      'T,CCC.,..~~~~~,....GGGf.GGGT',
      'T,WWW.,......,,....GGGGGGGGT',
      'T,WDW.,S,,,,,,.....GGG..GGGT',
      'T,,,,.,......,......,,.....T',
      'T..f.,,..gggg,......,,..f..T',
      'Tgggg,,..gggg,S,,,,,,......T',
      'Tgggg,,..gggg,.....ggggg...T',
      'Tgggg,,............ggggg...T',
      'T....,,,,,,,,,,S,,,ggggg...T',
      'T..f......,,.......f.......T',
      'T.........,,..f............T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT'
    ];

    const CENTER_ROWS = [
      'WWWWWWWWWWWWWWW',
      'WFFFFKKKKKFFFPW',
      'WFFFFKKKKKFFFFW',
      'WFFFFFFFFFFFFFW',
      'WFF,,,,,,,,FFFW',
      'WFF,,,,,,,,FFFW',
      'WFFFFFFFFFFFFFW',
      'WFFFFFFFFFFFFFW',
      'WFFFFFRRRFFFFFW',
      'WWWWWWWDWWWWWWW'
    ];

    const GYM_ROWS = [
      'MMMMMMMMMMMMMMM',
      'MFFFFF,,,FFFFFM',
      'MFFMFF,,,FFMFFM',
      'MFFFFF,,,FFFFFM',
      'MFFMFF,,,FFMFFM',
      'MFFFFF,,,FFFFFM',
      'MFFMFF,,,FFMFFM',
      'MFFFFF,,,FFFFFM',
      'MFFFFFRRRFFFFFM',
      'MMMMMMMEMMMMMMM'
    ];

    const SOLID_TILES = new Set(['T', '~', 'W', 'C', 'Y', 'M', 'K', 'S', 'P']);

    const MAPS = {
      overworld: {
        name: 'VIRIDIAN VALLEY',
        rows: OVERWORLD_ROWS,
        signs: {
          '7,4':  ['VIRIDIAN MYSTIC GROVE', 'Wild Vulpix, Poliwag, Bulbasaur, and Gastly lurk in the deep grass!'],
          '15,4': ['NORTH QUARRY & PEWTER GYM', 'Gym Leader Brock awaits inside the Gym ahead. Watch out for sturdy Rock-types!'],
          '7,10': ['POKEMON CENTER & MART', 'Step inside to heal your party with Nurse Joy or buy Poke Balls and Potions!'],
          '13,13':['TRAINER TIPS', 'Weaken wild Pokemon before throwing a Poke Ball from your BAG! Starters evolve at Lv. 8!'],
          '15,16':['PALLET TRAIL', 'South-West grass has Lv. 2-4 Pokemon - great for newly chosen starters!']
        },
        npcs: [
          {
            id: 'aide', x: 11, y: 17, sprite: 'npcTrainer', name: 'Prof. Aide',
            talk() {
              if (!Game.flags.aideGift) {
                Game.flags.aideGift = true;
                Game.bag.pokeball += 5;
                Game.bag.potion += 3;
                AudioEngine.playConfirm();
                updateHUD();
                showDialog([
                  'Prof. Aide: Oh, ' + Game.playerName + '! Prof. Oak sent me with field supplies!',
                  'Received 5 Poke Balls and 3 Potions! Good luck filling your Kanto Mini-Dex!'
                ]);
              } else {
                showDialog(['Prof. Aide: Try catching Pidgey, Pikachu, or Eevee in the Route 1 tall grass!']);
              }
            }
          },
          {
            id: 'lass_mia', x: 18, y: 11, sprite: 'npcTrainer', name: 'Lass Mia',
            talk() {
              if (!Game.flags.beatMia) {
                showDialog(['Lass Mia: My cute team loves battling travelers! Ready, set, go!'], () => {
                  startTrainerBattle('Lass Mia', [
                    createPokemon('eevee', 4),
                    createPokemon('pikachu', 5)
                  ], 260, 'beatMia', 'Lass Mia: Wow, your bond with your Pokemon is awesome!');
                });
              } else {
                showDialog(['Lass Mia: Electric attacks from Pikachu are super effective against Water and Flying types!']);
              }
            }
          }
        ],
        warps: {
          '3,10':  { map: 'center', x: 7, y: 8, dir: 'UP' },
          '24,4':  { map: 'gym',    x: 7, y: 8, dir: 'UP' }
        }
      },

      center: {
        name: 'POKEMON CENTER',
        rows: CENTER_ROWS,
        signs: { '13,1': ['BILL\'S PC STORAGE', 'Opening PC Box...'] },
        npcs: [
          {
            id: 'nurse_joy', x: 7, y: 1, sprite: 'npcNurse', name: 'Nurse Joy', interactFromCounter: true,
            talk() {
              healFullParty();
              AudioEngine.playHeal();
              Game.healFlash = 24;
              showDialog([
                'Nurse Joy: Welcome to our Pokemon Center!',
                'Your Pokemon have been restored to full HP and PP. We hope to see you again!'
              ]);
            }
          },
          {
            id: 'mart_clerk', x: 11, y: 3, sprite: 'npcTrainer', name: 'Mart Clerk',
            talk() { openShopMenu(); }
          }
        ],
        warps: { '7,9': { map: 'overworld', x: 3, y: 11, dir: 'DOWN' } }
      },

      gym: {
        name: 'PEWTER CITY GYM',
        rows: GYM_ROWS,
        signs: {},
        npcs: [
          {
            id: 'gym_guide', x: 5, y: 7, sprite: 'npcTrainer', name: 'Gym Guide',
            talk() {
              if (Game.flags.boulderBadge) {
                showDialog(['Gym Guide: Champ in the making! You conquered Pewter Gym! Talk to Brock anytime for an Elite Rematch!']);
              } else {
                showDialog([
                  'Gym Guide: Yo, Champ in the making! Brock uses rock-solid Rock-type Pokemon!',
                  'Water and Grass moves deal 2x damage! Catch a Poliwag or Bulbasaur in Viridian Grove if you need extra coverage!'
                ]);
              }
            }
          },
          {
            id: 'camper_liam', x: 7, y: 5, sprite: 'npcTrainer', name: 'Camper Liam',
            talk() {
              if (!Game.flags.beatLiam) {
                showDialog(['Camper Liam: Hold it! You are light-years away from facing Brock!'], () => {
                  startTrainerBattle('Camper Liam', [createPokemon('geodude', 6)], 240, 'beatLiam',
                    'Camper Liam: Whoa! Maybe you are zero light-years away after all!');
                });
              } else {
                showDialog(['Camper Liam: Go ahead - Brock is waiting right at the top platform!']);
              }
            }
          },
          {
            id: 'brock', x: 7, y: 2, sprite: 'npcBrock', name: 'Leader Brock',
            talk() {
              if (!Game.flags.boulderBadge) {
                showDialog([
                  'Brock: I am Brock, Pewter City\'s Gym Leader! My rock-hard willpower is evident in my Pokemon!',
                  'Show me your very best, Trainer!'
                ], () => {
                  startTrainerBattle('Leader Brock', [
                    createPokemon('geodude', 8),
                    createPokemon('onix', 10)
                  ], 1200, 'boulderBadge', 'Brock: I took you for granted! As proof of your victory, take the official BOULDER BADGE!');
                });
              } else {
                showDialog(['Brock: Ready for a Champion-tier rematch against my strengthened Rock team?'], () => {
                  startTrainerBattle('Leader Brock', [
                    createPokemon('geodude', 11),
                    createPokemon('onix', 13)
                  ], 900, 'brockRematch', 'Brock: Incredible strength! Keep raising your team to fill your Kanto Dex!');
                });
              }
            }
          }
        ],
        warps: { '7,9': { map: 'overworld', x: 24, y: 5, dir: 'DOWN' } }
      }
    };

    const tileCache = {};
    function buildTiles() {
      const codes = ['.', ',', 'T', 'g', 'G', 'Q', '~', 'f', 'S', 'W', 'C', 'Y', 'D', 'E', 'M', 'F', 'R', 'K', 'P'];
      codes.forEach(ch => {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const x = c.getContext('2d');
        x.fillStyle = (ch === 'F' || ch === 'K' || ch === 'P' || ch === 'R') ? '#e8e2cf' : '#78cf63';
        x.fillRect(0, 0, 32, 32);

        if (ch === '.' || ch === 'g' || ch === 'G' || ch === 'Q' || ch === 'f' || ch === 'T' || ch === 'S' || ch === 'M') {
          x.fillStyle = '#6abf56';
          x.fillRect(4, 6, 4, 2);
          x.fillRect(20, 22, 4, 2);
        }
        if (ch === ',') {
          x.fillStyle = '#e3c788'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#cca966'; x.fillRect(4, 4, 4, 4); x.fillRect(22, 14, 4, 4); x.fillRect(10, 24, 6, 2);
        } else if (ch === 'T') {
          x.fillStyle = '#1e4a27'; x.fillRect(2, 2, 28, 28);
          x.fillStyle = '#2d7339'; x.fillRect(4, 4, 24, 20);
          x.fillStyle = '#479e4f'; x.fillRect(8, 6, 16, 10);
          x.fillStyle = '#5c3b23'; x.fillRect(12, 24, 8, 8);
        } else if (ch === 'g' || ch === 'G' || ch === 'Q') {
          const dark = ch === 'Q' ? '#4e8a49' : (ch === 'G' ? '#24783c' : '#329443');
          const mid  = ch === 'Q' ? '#70b359' : (ch === 'G' ? '#36a353' : '#4bbd5b');
          x.fillStyle = dark;
          for (let rx = 2; rx < 30; rx += 8) { x.fillRect(rx, 4, 6, 10); x.fillRect(rx + 2, 18, 6, 10); }
          x.fillStyle = mid;
          for (let rx = 4; rx < 30; rx += 8) { x.fillRect(rx, 2, 2, 8); x.fillRect(rx + 2, 16, 2, 8); }
        } else if (ch === '~') {
          x.fillStyle = '#3887e8'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#73b6ff'; x.fillRect(4, 8, 10, 2); x.fillRect(16, 20, 12, 2);
        } else if (ch === 'f') {
          x.fillStyle = '#ffffff'; x.fillRect(6, 6, 6, 6); x.fillRect(20, 18, 6, 6);
          x.fillStyle = '#f5587b'; x.fillRect(8, 8, 2, 2);
          x.fillStyle = '#ffd43b'; x.fillRect(22, 20, 2, 2);
        } else if (ch === 'S') {
          x.fillStyle = '#5c3b20'; x.fillRect(14, 18, 4, 12);
          x.fillStyle = '#a8703e'; x.fillRect(4, 6, 24, 14);
          x.fillStyle = '#e6c594'; x.fillRect(8, 10, 16, 2); x.fillRect(8, 14, 12, 2);
        } else if (ch === 'W') {
          x.fillStyle = '#dfe5ed'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#b4bfcc'; x.fillRect(0, 14, 32, 2); x.fillRect(0, 30, 32, 2); x.fillRect(8, 4, 16, 8);
          x.fillStyle = '#6db1f5'; x.fillRect(10, 6, 12, 4);
        } else if (ch === 'C') {
          x.fillStyle = '#d93848'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#f56775'; x.fillRect(2, 4, 28, 6);
          x.fillStyle = '#ffffff'; x.fillRect(8, 16, 16, 10);
          x.fillStyle = '#d93848'; x.fillRect(14, 18, 4, 6); x.fillRect(12, 20, 8, 2);
        } else if (ch === 'Y') {
          x.fillStyle = '#c98a26'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#f0b946'; x.fillRect(2, 4, 28, 6);
          x.fillStyle = '#292d36'; x.fillRect(6, 16, 20, 10);
          x.fillStyle = '#ffd863'; x.fillRect(10, 19, 12, 4);
        } else if (ch === 'D' || ch === 'E') {
          x.fillStyle = '#333947'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = ch === 'D' ? '#58a8f5' : '#e8b43b'; x.fillRect(6, 4, 20, 28);
          x.fillStyle = '#1b1f29'; x.fillRect(15, 4, 2, 28);
        } else if (ch === 'M') {
          x.fillStyle = '#7d6e5d'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#9e8d79'; x.fillRect(4, 4, 24, 18);
          x.fillStyle = '#574c40'; x.fillRect(2, 24, 28, 6);
        } else if (ch === 'F') {
          x.fillStyle = '#ede6d3'; x.fillRect(0, 0, 32, 32);
          x.fillStyle = '#ded5be'; x.fillRect(0, 0, 16, 16); x.fillRect(16, 16, 16, 16);
        } else if (ch === 'R') {
          x.fillStyle = '#d93848'; x.fillRect(2, 4, 28, 24);
          x.fillStyle = '#ff8593'; x.fillRect(6, 8, 20, 16);
        } else if (ch === 'K') {
          x.fillStyle = '#c47d44'; x.fillRect(0, 4, 32, 26);
          x.fillStyle = '#e8a86b'; x.fillRect(0, 4, 32, 8);
        } else if (ch === 'P') {
          x.fillStyle = '#475366'; x.fillRect(4, 2, 24, 28);
          x.fillStyle = '#73d3ff'; x.fillRect(8, 6, 16, 12);
          x.fillStyle = '#e63946'; x.fillRect(10, 22, 4, 4);
        }
        tileCache[ch] = c;
      });
    }

    const SAVE_KEY = 'kanto_mini_quest_save_v1';

    const Game = {
      state: 'STARTER',
      starterIdx: 0,
      starters: ['bulbasaur', 'charmander', 'squirtle', 'pikachu'],
      playerName: 'RED',
      mapId: 'overworld',
      px: 9,
      py: 17,
      dir: 'DOWN',
      moveAnim: null,
      stepToggle: 0,
      healFlash: 0,
      party: [],
      pcBox: [],
      bag: { pokeball: 5, greatball: 1, potion: 3, superpotion: 0 },
      money: 300,
      seen: {},
      caught: {},
      flags: {},
      dialogQueue: [],
      dialogCallback: null,
      pauseCursor: 0,
      shopCursor: 0,
      pcCursor: 0,
      battle: null,
      particles: [],
      confirmReset: false
    };

    function markSeen(sp) { Game.seen[sp] = true; }
    function markCaught(sp) { Game.seen[sp] = true; Game.caught[sp] = true; }

    function saveGame() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          mapId: Game.mapId, px: Game.px, py: Game.py, dir: Game.dir,
          party: Game.party, pcBox: Game.pcBox, bag: Game.bag,
          money: Game.money, seen: Game.seen, caught: Game.caught, flags: Game.flags
        }));
      } catch (_) {}
    }

    function loadGame() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.party) || data.party.length === 0) return false;
        Game.mapId = data.mapId || 'overworld';
        Game.px = data.px ?? 9;
        Game.py = data.py ?? 17;
        Game.dir = data.dir || 'DOWN';
        Game.party = data.party;
        Game.pcBox = data.pcBox || [];
        Game.bag = Object.assign({ pokeball: 5, greatball: 1, potion: 3, superpotion: 0 }, data.bag || {});
        Game.money = data.money ?? 300;
        Game.seen = data.seen || {};
        Game.caught = data.caught || {};
        Game.flags = data.flags || {};
        Game.state = 'OVERWORLD';
        return true;
      } catch (_) { return false; }
    }

    function resetGame() {
      try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
      Game.state = 'STARTER';
      Game.starterIdx = 0;
      Game.mapId = 'overworld';
      Game.px = 9; Game.py = 17; Game.dir = 'DOWN';
      Game.moveAnim = null;
      Game.party = []; Game.pcBox = [];
      Game.bag = { pokeball: 5, greatball: 1, potion: 3, superpotion: 0 };
      Game.money = 300;
      Game.seen = {}; Game.caught = {}; Game.flags = {};
      Game.dialogQueue = []; Game.battle = null;
      updateHUD();
    }

    function healFullParty() {
      Game.party.forEach(p => {
        p.hp = p.maxHp;
        p.moves.forEach(m => { m.pp = m.maxPp; });
      });
      saveGame();
      updateHUD();
    }

    function showDialog(lines, onDone = null) {
      Game.dialogQueue = lines.slice();
      Game.dialogCallback = onDone;
      Game.state = 'DIALOG';
    }

    function advanceDialog() {
      AudioEngine.playBlip();
      Game.dialogQueue.shift();
      if (Game.dialogQueue.length === 0) {
        const cb = Game.dialogCallback;
        Game.dialogCallback = null;
        Game.state = 'OVERWORLD';
        if (cb) cb();
      }
    }

    const SHOP_ITEMS = [
      { key: 'pokeball',    label: 'Poke Ball',    price: 100, desc: 'Standard ball for catching wild Pokemon.' },
      { key: 'greatball',   label: 'Great Ball',   price: 250, desc: 'High-performance 1.7x catch rate ball!' },
      { key: 'potion',      label: 'Potion',       price: 120, desc: 'Restores 28 HP to an injured Pokemon.' },
      { key: 'superpotion', label: 'Super Potion', price: 280, desc: 'Restores 65 HP to an injured Pokemon.' }
    ];

    function openShopMenu() {
      AudioEngine.playConfirm();
      Game.shopCursor = 0;
      Game.state = 'SHOP';
    }

    function buyShopItem(idx) {
      const item = SHOP_ITEMS[idx];
      if (!item) return;
      if (Game.money < item.price) {
        AudioEngine.playCancel();
        showDialog(['Mart Clerk: Oops! You do not have enough money for a ' + item.label + '.']);
        return;
      }
      Game.money -= item.price;
      Game.bag[item.key] = (Game.bag[item.key] || 0) + 1;
      AudioEngine.playConfirm();
      saveGame();
      updateHUD();
    }

    function getMapTile(map, x, y) {
      if (y < 0 || y >= map.rows.length) return 'T';
      const row = map.rows[y];
      if (x < 0 || x >= row.length) return 'T';
      return row[x];
    }

    function tryMovePlayer(dir) {
      if (Game.moveAnim) return;
      Game.dir = dir;
      const dx = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
      const dy = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
      const nx = Game.px + dx;
      const ny = Game.py + dy;
      const map = MAPS[Game.mapId];

      const warpKey = nx + ',' + ny;
      if (map.warps && map.warps[warpKey]) {
        const w = map.warps[warpKey];
        AudioEngine.playConfirm();
        Game.mapId = w.map; Game.px = w.x; Game.py = w.y; Game.dir = w.dir;
        saveGame();
        updateHUD();
        return;
      }

      const tile = getMapTile(map, nx, ny);
      const npcHit = map.npcs.find(n => n.x === nx && n.y === ny);
      if (SOLID_TILES.has(tile) || npcHit) {
        AudioEngine.playBump();
        return;
      }

      AudioEngine.playStep();
      Game.stepToggle = 1 - Game.stepToggle;
      Game.moveAnim = { fromX: Game.px, fromY: Game.py, toX: nx, toY: ny, t: 0, dur: 145, tile };
      Game.px = nx;
      Game.py = ny;
    }

    function onStepComplete(tile) {
      if (tile === 'g' || tile === 'G' || tile === 'Q') {
        for (let i = 0; i < 4; i++) {
          Game.particles.push({
            world: true,
            x: Game.px * 32 + 8 + Math.random() * 16,
            y: Game.py * 32 + 12 + Math.random() * 14,
            vx: (Math.random() - 0.5) * 1.4,
            vy: -0.8 - Math.random() * 1.1,
            color: '#6ce079', size: 4, life: 20
          });
        }
        if (Math.random() < 0.17) {
          triggerWildEncounter(tile);
          return;
        }
      }
      saveGame();
    }

    function interactAhead() {
      const dx = Game.dir === 'LEFT' ? -1 : Game.dir === 'RIGHT' ? 1 : 0;
      const dy = Game.dir === 'UP' ? -1 : Game.dir === 'DOWN' ? 1 : 0;
      const tx = Game.px + dx;
      const ty = Game.py + dy;
      const map = MAPS[Game.mapId];

      let npc = map.npcs.find(n => n.x === tx && n.y === ty);
      if (!npc && getMapTile(map, tx, ty) === 'K') {
        npc = map.npcs.find(n => n.interactFromCounter && n.x === tx && n.y === ty - 1);
      }
      if (npc) { npc.talk(); return; }

      if (getMapTile(map, tx, ty) === 'P') {
        if (Game.pcBox.length === 0) {
          showDialog(['BILL\'S PC: Your PC Storage Box is currently empty. Catch more than 6 Pokemon to store extras here!']);
        } else {
          AudioEngine.playConfirm();
          Game.pcCursor = 0;
          Game.state = 'PC_BOX';
        }
        return;
      }

      const signKey = tx + ',' + ty;
      if (map.signs && map.signs[signKey]) showDialog(map.signs[signKey]);
    }

    function pickFirstHealthyIdx() {
      return Game.party.findIndex(p => p.hp > 0);
    }

    function triggerWildEncounter(grassType) {
      let pool, minLv, maxLv;
      if (grassType === 'g') {
        pool = ['pidgey', 'pikachu', 'eevee', 'bulbasaur', 'squirtle', 'charmander'];
        minLv = 2; maxLv = 4;
      } else if (grassType === 'G') {
        pool = ['vulpix', 'poliwag', 'gastly', 'bulbasaur', 'pikachu', 'eevee'];
        minLv = 4; maxLv = 7;
      } else {
        pool = Game.flags.boulderBadge
          ? ['geodude', 'onix', 'gastly', 'pikachu', 'charmander']
          : ['geodude', 'vulpix', 'poliwag', 'gastly', 'onix'];
        minLv = 6; maxLv = 9;
      }
      const sp = pool[Math.floor(Math.random() * pool.length)];
      const lv = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));
      const wild = createPokemon(sp, lv);
      markSeen(sp);

      AudioEngine.playEncounter();
      startBattle({
        isTrainer: false, trainerName: null, enemyParty: [wild],
        reward: lv * 32, flagOnWin: null, winQuote: null
      });
    }

    function startTrainerBattle(trainerName, enemyParty, reward, flagOnWin, winQuote) {
      enemyParty.forEach(p => markSeen(p.species));
      AudioEngine.playEncounter();
      startBattle({
        isTrainer: true, trainerName, enemyParty, reward, flagOnWin, winQuote
      });
    }

    function startBattle(cfg) {
      if (pickFirstHealthyIdx() < 0) healFullParty();
      const activeIdx = Math.max(0, pickFirstHealthyIdx());
      Game.battle = {
        isTrainer: cfg.isTrainer,
        trainerName: cfg.trainerName,
        enemies: cfg.enemyParty,
        enemyIdx: 0,
        playerIdx: activeIdx,
        reward: cfg.reward,
        flagOnWin: cfg.flagOnWin,
        winQuote: cfg.winQuote,
        phase: 'MESSAGE',
        menuCursor: 0,
        moveCursor: 0,
        bagCursor: 0,
        partyCursor: 0,
        forceSwitch: false,
        msgQueue: [],
        afterMsg: null,
        introWipe: 18,
        pLunge: 0, eLunge: 0, pFlash: 0, eFlash: 0,
        enemyHidden: false,
        ballAnim: null
      };
      Game.state = 'BATTLE';
      const foe = currentEnemy();
      const introLine = cfg.isTrainer
        ? (cfg.trainerName + ' sent out ' + foe.name + ' (Lv.' + foe.level + ')!')
        : ('A wild ' + foe.name + ' (Lv.' + foe.level + ') appeared!');
      queueBattleMsg([introLine, 'Go! ' + currentPlayer().name + '!'], () => {
        Game.battle.phase = 'MENU';
      });
      updateHUD();
    }

    function currentPlayer() { return Game.party[Game.battle.playerIdx]; }
    function currentEnemy() { return Game.battle.enemies[Game.battle.enemyIdx]; }

    function queueBattleMsg(lines, nextFn = null) {
      Game.battle.msgQueue = lines.slice();
      Game.battle.afterMsg = nextFn;
      Game.battle.phase = 'MESSAGE';
    }

    function advanceBattleMsg() {
      AudioEngine.playBlip();
      const b = Game.battle;
      b.msgQueue.shift();
      if (b.msgQueue.length === 0) {
        const fn = b.afterMsg;
        b.afterMsg = null;
        if (fn) fn();
      }
    }

    function spawnBattleFx(targetIsEnemy, moveType) {
      const cx = targetIsEnemy ? 348 : 124;
      const cy = targetIsEnemy ? 92 : 168;
      const col = TYPE_COLORS[moveType] || '#ffffff';
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const spd = 1.6 + Math.random() * 2.4;
        Game.particles.push({
          world: false, x: cx, y: cy,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          color: i % 2 === 0 ? col : '#ffffff', size: 5, life: 18
        });
      }
    }

    function calcDamage(attacker, defender, moveObj) {
      if (moveObj.power === 0) return { dmg: 0, eff: 1 };
      const stab = attacker.type === moveObj.type ? 1.25 : 1.0;
      const eff = getEffectiveness(moveObj.type, defender.type);
      const rand = 0.88 + Math.random() * 0.14;
      const raw = (((2 * attacker.level / 5 + 2) * moveObj.power * (attacker.atk / Math.max(4, defender.def))) / 18 + 2) * stab * eff * rand;
      return { dmg: Math.max(2, Math.floor(raw)), eff };
    }

    function executeTurn(playerAction) {
      const p = currentPlayer();
      const e = currentEnemy();
      const aiMoveSlot = chooseEnemyMove(e, p);

      if (playerAction.kind === 'ITEM' || playerAction.kind === 'SWITCH' || playerAction.kind === 'RUN') {
        runPlayerSpecialAction(playerAction, () => {
          if (Game.state !== 'BATTLE' || e.hp <= 0) return;
          performSingleMove(e, p, aiMoveSlot, false, () => { checkPostAttackState(); });
        });
        return;
      }

      const pMove = MOVES[playerAction.moveSlot.key];
      const eMove = MOVES[aiMoveSlot.key];
      const pPrio = pMove.prio || 0;
      const ePrio = eMove.prio || 0;
      const playerFirst = pPrio !== ePrio ? (pPrio > ePrio) : (p.spd >= e.spd);

      if (playerFirst) {
        performSingleMove(p, e, playerAction.moveSlot, true, () => {
          if (e.hp <= 0) handleEnemyFaint();
          else performSingleMove(e, p, aiMoveSlot, false, () => { checkPostAttackState(); });
        });
      } else {
        performSingleMove(e, p, aiMoveSlot, false, () => {
          if (p.hp <= 0) checkPostAttackState();
          else performSingleMove(p, e, playerAction.moveSlot, true, () => {
            if (e.hp <= 0) handleEnemyFaint();
            else checkPostAttackState();
          });
        });
      }
    }

    function chooseEnemyMove(enemy, player) {
      let best = enemy.moves[0];
      let bestScore = -1;
      enemy.moves.forEach(slot => {
        const mv = MOVES[slot.key];
        const eff = mv.power > 0 ? getEffectiveness(mv.type, player.type) : 0.4;
        const score = (mv.power || 15) * eff * (0.8 + Math.random() * 0.4);
        if (score > bestScore) { bestScore = score; best = slot; }
      });
      return best;
    }

    function performSingleMove(attacker, defender, moveSlot, isPlayerAtk, onDone) {
      const b = Game.battle;
      const mv = MOVES[moveSlot.key];
      if (moveSlot.pp > 0) moveSlot.pp--;

      const prefix = isPlayerAtk ? '' : (b.isTrainer ? 'Foe ' : 'Wild ');
      const msgs = [prefix + attacker.name + ' used ' + mv.name + '!'];

      if (Math.random() * 100 > mv.acc) {
        msgs.push(attacker.name + '\'s attack missed!');
        queueBattleMsg(msgs, onDone);
        return;
      }

      if (isPlayerAtk) b.pLunge = 10; else b.eLunge = 10;
      AudioEngine.playAttack(mv.type);
      spawnBattleFx(isPlayerAtk, mv.type);

      if (mv.debuff === 'atk') {
        defender.atk = Math.max(4, Math.floor(defender.atk * 0.86));
        msgs.push(defender.name + '\'s Attack fell!');
        updateHUD();
        queueBattleMsg(msgs, onDone);
        return;
      }

      const { dmg, eff } = calcDamage(attacker, defender, mv);
      defender.hp = Math.max(0, defender.hp - dmg);
      if (isPlayerAtk) b.eFlash = 12; else b.pFlash = 12;

      if (eff > 1.1) msgs.push('It\'s super effective!');
      else if (eff < 0.9) msgs.push('It\'s not very effective...');

      if (mv.drain && attacker.hp > 0) {
        const heal = Math.max(2, Math.floor(dmg * 0.45));
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        msgs.push(attacker.name + ' drained energy!');
      }

      updateHUD();
      queueBattleMsg(msgs, onDone);
    }

    function runPlayerSpecialAction(action, onContinueEnemyTurn) {
      const b = Game.battle;
      const p = currentPlayer();
      const e = currentEnemy();

      if (action.kind === 'RUN') {
        if (b.isTrainer) {
          queueBattleMsg(['No! There\'s no running from a Trainer battle!'], () => { b.phase = 'MENU'; });
          return;
        }
        AudioEngine.playCancel();
        queueBattleMsg(['Got away safely!'], () => {
          Game.state = 'OVERWORLD';
          Game.battle = null;
          saveGame();
        });
        return;
      }

      if (action.kind === 'SWITCH') {
        b.playerIdx = action.targetIdx;
        AudioEngine.playConfirm();
        updateHUD();
        queueBattleMsg(['Come back, ' + p.name + '!', 'Go! ' + currentPlayer().name + '!'], onContinueEnemyTurn);
        return;
      }

      if (action.kind === 'ITEM') {
        const itemKey = action.itemKey;
        if (itemKey === 'potion' || itemKey === 'superpotion') {
          const healAmt = itemKey === 'superpotion' ? 65 : 28;
          Game.bag[itemKey]--;
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          AudioEngine.playHeal();
          updateHUD();
          queueBattleMsg(['Used ' + (itemKey === 'superpotion' ? 'Super Potion' : 'Potion') + ' on ' + p.name + '!'], onContinueEnemyTurn);
          return;
        }

        if (itemKey === 'pokeball' || itemKey === 'greatball') {
          if (b.isTrainer) {
            queueBattleMsg(['The Trainer blocked your Poke Ball! Don\'t be a thief!'], () => { b.phase = 'MENU'; });
            return;
          }
          Game.bag[itemKey]--;
          updateHUD();
          const bonus = itemKey === 'greatball' ? 1.7 : 1.0;
          const hpRatio = e.hp / e.maxHp;
          const catchProb = Math.min(0.95, ((1.18 - 0.72 * hpRatio) * 0.65 * bonus));
          const caught = Math.random() < catchProb;
          const shakes = caught ? 3 : (1 + Math.floor(Math.random() * 2));

          AudioEngine.playBallThrow();
          b.phase = 'BALL_ANIM';
          b.ballAnim = { itemKey, t: 0, shakes, caught, shakeDone: 0 };
        }
      }
    }

    function finishBallAnim() {
      const b = Game.battle;
      const anim = b.ballAnim;
      const e = currentEnemy();
      b.ballAnim = null;

      if (anim.caught) {
        AudioEngine.playCatchSuccess();
        markCaught(e.species);
        spawnBattleFx(true, 'Electric');
        let destMsg;
        if (Game.party.length < 6) {
          Game.party.push(e);
          destMsg = e.name + ' joined your active Party!';
        } else {
          e.hp = e.maxHp;
          Game.pcBox.push(e);
          destMsg = e.name + ' was transferred to Bill\'s PC Box!';
        }
        const p = currentPlayer();
        p.xp += e.level * 10;
        const extraMsgs = ['Gotcha! ' + e.name + ' was caught!', destMsg];
        checkLevelAndEvolution(p, extraMsgs);
        updateHUD();
        queueBattleMsg(extraMsgs, () => {
          Game.state = 'OVERWORLD';
          Game.battle = null;
          saveGame();
          updateHUD();
        });
      } else {
        b.enemyHidden = false;
        AudioEngine.playCancel();
        queueBattleMsg(['Oh no! Wild ' + e.name + ' broke free!'], () => {
          const aiMove = chooseEnemyMove(e, currentPlayer());
          performSingleMove(e, currentPlayer(), aiMove, false, () => { checkPostAttackState(); });
        });
      }
    }

    function checkLevelAndEvolution(pkm, msgOut) {
      let leveled = false;
      while (pkm.xp >= pkm.nextXp && pkm.level < 50) {
        pkm.xp -= pkm.nextXp;
        pkm.level++;
        recalcStats(pkm, true);
        leveled = true;
        msgOut.push(pkm.name + ' grew to Lv. ' + pkm.level + '!');

        const spData = SPECIES[pkm.species];
        if (spData.evolveLvl && pkm.level >= spData.evolveLvl && spData.evolveTo) {
          const oldName = pkm.name;
          pkm.species = spData.evolveTo;
          recalcStats(pkm, true);
          markCaught(pkm.species);
          msgOut.push('What?! ' + oldName + ' evolved into ' + pkm.name + '!');
        }
      }
      if (leveled) AudioEngine.playLevelUp();
    }

    function handleEnemyFaint() {
      const b = Game.battle;
      const e = currentEnemy();
      const p = currentPlayer();
      const xpGain = Math.floor(e.level * (b.isTrainer ? 21 : 16));
      p.xp += xpGain;
      const msgs = [(b.isTrainer ? 'Foe ' : 'Wild ') + e.name + ' fainted!', p.name + ' gained ' + xpGain + ' EXP!'];
      checkLevelAndEvolution(p, msgs);
      updateHUD();

      queueBattleMsg(msgs, () => {
        if (b.enemyIdx + 1 < b.enemies.length) {
          b.enemyIdx++;
          const nextFoe = currentEnemy();
          markSeen(nextFoe.species);
          queueBattleMsg([b.trainerName + ' sent out ' + nextFoe.name + ' (Lv.' + nextFoe.level + ')!'], () => {
            b.phase = 'MENU';
          });
        } else {
          AudioEngine.playVictory();
          Game.money += b.reward;
          const endMsgs = [];
          if (b.isTrainer) {
            endMsgs.push('You defeated ' + b.trainerName + '!');
            if (b.winQuote) endMsgs.push(b.winQuote);
            endMsgs.push('Received $' + b.reward + ' prize money!');
            if (b.flagOnWin) {
              Game.flags[b.flagOnWin] = true;
              if (b.flagOnWin === 'boulderBadge') {
                endMsgs.push('CONGRATULATIONS! You earned the Pewter Gym BOULDER BADGE!');
              }
            }
          } else {
            endMsgs.push('Picked up $' + b.reward + ' after the battle!');
          }
          updateHUD();
          queueBattleMsg(endMsgs, () => {
            Game.state = 'OVERWORLD';
            Game.battle = null;
            saveGame();
            updateHUD();
          });
        }
      });
    }

    function checkPostAttackState() {
      const b = Game.battle;
      const p = currentPlayer();
      if (p.hp > 0) { b.phase = 'MENU'; return; }

      const nextAlive = pickFirstHealthyIdx();
      if (nextAlive >= 0) {
        queueBattleMsg([p.name + ' fainted! Choose your next Pokemon!'], () => {
          b.forceSwitch = true;
          b.partyCursor = nextAlive;
          b.phase = 'PARTY';
        });
      } else {
        queueBattleMsg([
          p.name + ' fainted! You have no more Pokemon that can fight!',
          'You scurried back to the Pokemon Center, protecting your exhausted team!'
        ], () => {
          Game.state = 'OVERWORLD';
          Game.battle = null;
          Game.mapId = 'center';
          Game.px = 7; Game.py = 4; Game.dir = 'UP';
          healFullParty();
          AudioEngine.playHeal();
        });
      }
    }

    const heldDirs = [];

    function handleCommand(cmd) {
      AudioEngine.ensure();

      if (Game.state === 'STARTER') {
        if (cmd === 'LEFT' || cmd === 'UP') { Game.starterIdx = (Game.starterIdx + 3) % 4; AudioEngine.playBlip(); }
        else if (cmd === 'RIGHT' || cmd === 'DOWN') { Game.starterIdx = (Game.starterIdx + 1) % 4; AudioEngine.playBlip(); }
        else if (cmd === 'A' || cmd === 'START') selectStarter(Game.starterIdx);
        return;
      }
      if (Game.state === 'DIALOG') {
        if (cmd === 'A' || cmd === 'B' || cmd === 'START') advanceDialog();
        return;
      }
      if (Game.state === 'OVERWORLD') {
        if (cmd === 'UP' || cmd === 'DOWN' || cmd === 'LEFT' || cmd === 'RIGHT') tryMovePlayer(cmd);
        else if (cmd === 'A') interactAhead();
        else if (cmd === 'START' || cmd === 'SELECT') {
          AudioEngine.playBlip();
          Game.pauseCursor = 0;
          Game.state = 'PAUSE_MENU';
        }
        return;
      }
      if (Game.state === 'PAUSE_MENU') {
        if (cmd === 'UP') { Game.pauseCursor = (Game.pauseCursor + 3) % 4; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN') { Game.pauseCursor = (Game.pauseCursor + 1) % 4; AudioEngine.playBlip(); }
        else if (cmd === 'B' || cmd === 'START') { AudioEngine.playCancel(); Game.state = 'OVERWORLD'; }
        else if (cmd === 'A') {
          if (Game.pauseCursor === 0) { AudioEngine.playConfirm(); Game.state = 'OVERWORLD'; }
          else if (Game.pauseCursor === 1) useOverworldPotion('potion');
          else if (Game.pauseCursor === 2) {
            saveGame(); AudioEngine.playConfirm();
            showDialog(['Game progress saved! Your team, badges, and Kanto Mini-Dex are stored safely.']);
          } else if (Game.pauseCursor === 3) {
            showDialog(['TIP: Click any Pokemon in your Active Party panel on the right to make it your lead fighter!']);
          }
        }
        return;
      }
      if (Game.state === 'SHOP') {
        if (cmd === 'UP') { Game.shopCursor = (Game.shopCursor + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN') { Game.shopCursor = (Game.shopCursor + 1) % SHOP_ITEMS.length; AudioEngine.playBlip(); }
        else if (cmd === 'B' || cmd === 'START') { AudioEngine.playCancel(); Game.state = 'OVERWORLD'; }
        else if (cmd === 'A') buyShopItem(Game.shopCursor);
        return;
      }
      if (Game.state === 'PC_BOX') {
        if (Game.pcBox.length === 0) { Game.state = 'OVERWORLD'; return; }
        if (cmd === 'UP') { Game.pcCursor = (Game.pcCursor + Game.pcBox.length - 1) % Game.pcBox.length; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN') { Game.pcCursor = (Game.pcCursor + 1) % Game.pcBox.length; AudioEngine.playBlip(); }
        else if (cmd === 'B' || cmd === 'START') { AudioEngine.playCancel(); Game.state = 'OVERWORLD'; }
        else if (cmd === 'A') {
          const fromBox = Game.pcBox.splice(Game.pcCursor, 1)[0];
          const fromParty = Game.party[0];
          Game.party[0] = fromBox;
          Game.pcBox.push(fromParty);
          AudioEngine.playConfirm();
          saveGame();
          updateHUD();
          showDialog(['Swapped ' + fromParty.name + ' into PC Box and withdrew ' + fromBox.name + ' as lead!']);
        }
        return;
      }
      if (Game.state === 'BATTLE') handleBattleInput(cmd);
    }

    function handleBattleInput(cmd) {
      const b = Game.battle;
      if (!b || b.phase === 'BALL_ANIM') return;

      if (b.phase === 'MESSAGE') {
        if (cmd === 'A' || cmd === 'B' || cmd === 'START') advanceBattleMsg();
        return;
      }
      if (b.phase === 'MENU') {
        if (cmd === 'LEFT' && (b.menuCursor % 2 === 1)) { b.menuCursor--; AudioEngine.playBlip(); }
        else if (cmd === 'RIGHT' && (b.menuCursor % 2 === 0)) { b.menuCursor++; AudioEngine.playBlip(); }
        else if (cmd === 'UP' && b.menuCursor >= 2) { b.menuCursor -= 2; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN' && b.menuCursor < 2) { b.menuCursor += 2; AudioEngine.playBlip(); }
        else if (cmd === 'A') {
          AudioEngine.playConfirm();
          if (b.menuCursor === 0) { b.moveCursor = 0; b.phase = 'MOVES'; }
          else if (b.menuCursor === 1) { b.bagCursor = 0; b.phase = 'BAG'; }
          else if (b.menuCursor === 2) { b.forceSwitch = false; b.partyCursor = b.playerIdx; b.phase = 'PARTY'; }
          else if (b.menuCursor === 3) executeTurn({ kind: 'RUN' });
        }
        return;
      }
      if (b.phase === 'MOVES') {
        const moves = currentPlayer().moves;
        if (cmd === 'B') { AudioEngine.playCancel(); b.phase = 'MENU'; return; }
        if (cmd === 'LEFT' && (b.moveCursor % 2 === 1)) { b.moveCursor--; AudioEngine.playBlip(); }
        else if (cmd === 'RIGHT' && (b.moveCursor % 2 === 0) && b.moveCursor + 1 < moves.length) { b.moveCursor++; AudioEngine.playBlip(); }
        else if (cmd === 'UP' && b.moveCursor >= 2) { b.moveCursor -= 2; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN' && b.moveCursor + 2 < moves.length) { b.moveCursor += 2; AudioEngine.playBlip(); }
        else if (cmd === 'A') {
          const chosen = moves[b.moveCursor];
          if (chosen) { AudioEngine.playConfirm(); executeTurn({ kind: 'MOVE', moveSlot: chosen }); }
        }
        return;
      }
      if (b.phase === 'BAG') {
        const items = ['pokeball', 'greatball', 'potion', 'superpotion'];
        if (cmd === 'B') { AudioEngine.playCancel(); b.phase = 'MENU'; return; }
        if (cmd === 'UP') { b.bagCursor = (b.bagCursor + 3) % 4; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN') { b.bagCursor = (b.bagCursor + 1) % 4; AudioEngine.playBlip(); }
        else if (cmd === 'A') {
          const k = items[b.bagCursor];
          if ((Game.bag[k] || 0) <= 0) AudioEngine.playCancel();
          else executeTurn({ kind: 'ITEM', itemKey: k });
        }
        return;
      }
      if (b.phase === 'PARTY') {
        if (cmd === 'B' && !b.forceSwitch) { AudioEngine.playCancel(); b.phase = 'MENU'; return; }
        if (cmd === 'UP') { b.partyCursor = (b.partyCursor + Game.party.length - 1) % Game.party.length; AudioEngine.playBlip(); }
        else if (cmd === 'DOWN') { b.partyCursor = (b.partyCursor + 1) % Game.party.length; AudioEngine.playBlip(); }
        else if (cmd === 'A') {
          const target = Game.party[b.partyCursor];
          if (!target || target.hp <= 0 || b.partyCursor === b.playerIdx) { AudioEngine.playCancel(); return; }
          if (b.forceSwitch) {
            b.forceSwitch = false;
            b.playerIdx = b.partyCursor;
            AudioEngine.playConfirm();
            updateHUD();
            queueBattleMsg(['Go! ' + currentPlayer().name + '!'], () => { b.phase = 'MENU'; });
          } else {
            executeTurn({ kind: 'SWITCH', targetIdx: b.partyCursor });
          }
        }
      }
    }

    function selectStarter(idx) {
      const sp = Game.starters[idx];
      const starter = createPokemon(sp, 5);
      Game.party = [starter];
      markCaught(sp);
      AudioEngine.playCatchSuccess();
      Game.state = 'OVERWORLD';
      saveGame();
      updateHUD();
      showDialog([
        'Prof. Oak: Excellent choice! ' + starter.name + ' looks energized and ready for adventure!',
        'Talk to my Aide right beside you for free Poke Balls, train in the tall grass, and challenge Brock in Pewter Gym!'
      ]);
    }

    function useOverworldPotion(itemKey) {
      if ((Game.bag[itemKey] || 0) <= 0) {
        AudioEngine.playCancel();
        showDialog(['You do not have any ' + (itemKey === 'superpotion' ? 'Super Potions' : 'Potions') + ' left!']);
        return;
      }
      const injured = Game.party.find(p => p.hp > 0 && p.hp < p.maxHp) || Game.party.find(p => p.hp < p.maxHp);
      if (!injured) {
        AudioEngine.playCancel();
        showDialog(['All of your Pokemon are already at full health!']);
        return;
      }
      if (injured.hp <= 0) {
        AudioEngine.playCancel();
        showDialog(['Fainted Pokemon need Nurse Joy at the Pokemon Center!']);
        return;
      }
      const amt = itemKey === 'superpotion' ? 65 : 28;
      Game.bag[itemKey]--;
      injured.hp = Math.min(injured.maxHp, injured.hp + amt);
      AudioEngine.playHeal();
      saveGame();
      updateHUD();
      showDialog(['Restored ' + injured.name + '\'s HP with a ' + (itemKey === 'superpotion' ? 'Super Potion' : 'Potion') + '!']);
    }

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    function drawGbaBox(x, y, w, h, fill = '#f8f8f0', borderOuter = '#242936', borderAccent = '#60789c') {
      ctx.fillStyle = borderOuter;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = borderAccent;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = fill;
      ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
    }

    function drawRightCursor(x, y, col = '#d93848') {
      ctx.fillStyle = col;
      ctx.fillRect(x, y - 8, 2, 10);
      ctx.fillRect(x + 2, y - 6, 2, 6);
      ctx.fillRect(x + 4, y - 4, 2, 2);
    }

    function drawDownCursor(x, y, col = '#d93848') {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 10, 2);
      ctx.fillRect(x + 2, y + 2, 6, 2);
      ctx.fillRect(x + 4, y + 4, 2, 2);
    }

    function wrapCanvasText(text, x, y, maxW, lineH) {
      const words = String(text || '').split(' ');
      let line = '';
      let cy = y;
      for (let i = 0; i < words.length; i++) {
        const test = line ? (line + ' ' + words[i]) : words[i];
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, cy);
          line = words[i];
          cy += lineH;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, cy);
    }

    function renderStarterScreen(now) {
      ctx.fillStyle = '#3870c4';
      ctx.fillRect(0, 0, 480, 195);
      ctx.fillStyle = '#6ec858';
      ctx.fillRect(0, 195, 480, 125);
      ctx.fillStyle = '#4ea33e';
      ctx.fillRect(0, 195, 480, 8);

      drawGbaBox(24, 14, 432, 54, '#fff8dc', '#1c2230', '#d99b26');
      ctx.fillStyle = '#1c2230';
      ctx.font = 'bold 18px "SF Mono", "Consolas", monospace';
      ctx.fillText('POKEMON: KANTO MINI QUEST', 92, 38);
      ctx.font = '12px "SF Mono", "Consolas", monospace';
      ctx.fillStyle = '#525b6e';
      ctx.fillText('CHOOSE YOUR PARTNER POKEMON TO BEGIN', 105, 56);

      Game.starters.forEach((sp, i) => {
        const bx = 26 + i * 109;
        const by = 86;
        const selected = i === Game.starterIdx;
        drawGbaBox(bx, by, 98, 126, selected ? '#ffffff' : '#e9eef7', '#1c2230', selected ? '#e03a48' : '#7b8ba6');

        const bob = selected ? Math.round(Math.sin(now / 150) * 3) : 0;
        drawPixelSprite(ctx, sp, bx + 17, by + 16 + bob, 4, false, false);

        const data = SPECIES[sp];
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 12px "SF Mono", "Consolas", monospace';
        ctx.fillText(data.name, bx + 10, by + 95);

        ctx.fillStyle = TYPE_COLORS[data.type];
        ctx.fillRect(bx + 10, by + 101, 78, 15);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "SF Mono", "Consolas", monospace';
        ctx.fillText(data.type.toUpperCase(), bx + 20, by + 112);

        if (selected) drawDownCursor(bx + 44, by - 10, '#ffdd33');
      });

      drawGbaBox(24, 228, 432, 78, '#f8f8f0', '#1c2230', '#4f6d96');
      ctx.fillStyle = '#1c2230';
      ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
      const chosen = SPECIES[Game.starters[Game.starterIdx]];
      ctx.fillText('Prof. Oak: Will you choose ' + chosen.name + ' (' + chosen.type + '-type)?', 40, 254);
      ctx.font = '12px "SF Mono", "Consolas", monospace';
      ctx.fillStyle = '#475266';
      ctx.fillText('Use LEFT/RIGHT (or click a card) + press A / ENTER to start!', 40, 278);
    }

    function renderOverworld(now, dt) {
      const map = MAPS[Game.mapId];

      let renderPx = Game.px * 32;
      let renderPy = Game.py * 32;
      if (Game.moveAnim) {
        Game.moveAnim.t += dt;
        const p = Math.min(1, Game.moveAnim.t / Game.moveAnim.dur);
        renderPx = (Game.moveAnim.fromX + (Game.moveAnim.toX - Game.moveAnim.fromX) * p) * 32;
        renderPy = (Game.moveAnim.fromY + (Game.moveAnim.toY - Game.moveAnim.fromY) * p) * 32;
        if (p >= 1) {
          const doneTile = Game.moveAnim.tile;
          Game.moveAnim = null;
          onStepComplete(doneTile);
        }
      }

      const mapW = map.rows[0].length * 32;
      const mapH = map.rows.length * 32;
      let camX = Math.floor(renderPx + 16 - 240);
      let camY = Math.floor(renderPy + 16 - 160);
      if (mapW <= 480) camX = Math.floor((mapW - 480) / 2);
      else camX = Math.max(0, Math.min(mapW - 480, camX));
      if (mapH <= 320) camY = Math.floor((mapH - 320) / 2);
      else camY = Math.max(0, Math.min(mapH - 320, camY));

      ctx.fillStyle = '#181c24';
      ctx.fillRect(0, 0, 480, 320);

      for (let r = 0; r < map.rows.length; r++) {
        const sy = r * 32 - camY;
        if (sy < -32 || sy > 320) continue;
        const row = map.rows[r];
        for (let c = 0; c < row.length; c++) {
          const sx = c * 32 - camX;
          if (sx < -32 || sx > 480) continue;
          const ch = row[c];
          const tileImg = tileCache[ch] || tileCache['.'];
          ctx.drawImage(tileImg, sx, sy);

          if (ch === '~' && ((Math.floor(now / 420) + r + c) % 2 === 0)) {
            ctx.fillStyle = '#a8d5ff';
            ctx.fillRect(sx + 10, sy + 14, 10, 2);
          }
        }
      }

      if (Game.mapId === 'overworld') {
        ctx.font = 'bold 10px "SF Mono", "Consolas", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PKMN', 2 * 32 - camX + 4, 8 * 32 - camY + 24);
        ctx.fillStyle = '#1b1f29';
        ctx.fillText('GYM', 23 * 32 - camX + 6, 2 * 32 - camY + 25);
      }

      map.npcs.forEach(npc => {
        const nx = npc.x * 32 - camX;
        const ny = npc.y * 32 - camY;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(nx + 6, ny + 24, 20, 5);
        drawPixelSprite(ctx, npc.sprite, nx, ny, 2, false, false);
      });

      const plX = Math.floor(renderPx - camX);
      const plY = Math.floor(renderPy - camY);
      const walkBob = Game.moveAnim ? (Math.sin((Game.moveAnim.t / Game.moveAnim.dur) * Math.PI) * -3) : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.fillRect(plX + 6, plY + 24, 20, 5);
      let pSprite = 'playerDown';
      let flip = false;
      if (Game.dir === 'UP') pSprite = 'playerUp';
      else if (Game.dir === 'LEFT') { pSprite = 'playerSide'; flip = true; }
      else if (Game.dir === 'RIGHT') { pSprite = 'playerSide'; flip = false; }
      drawPixelSprite(ctx, pSprite, plX, plY + walkBob, 2, flip, false);

      updateAndDrawParticles(true, camX, camY);

      if (Game.healFlash > 0) {
        Game.healFlash--;
        if (Game.healFlash % 4 < 2) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(0, 0, 480, 320);
        }
      }

      ctx.fillStyle = 'rgba(20, 24, 34, 0.78)';
      ctx.fillRect(8, 8, 166, 22);
      ctx.fillStyle = '#f8f9fc';
      ctx.font = 'bold 11px "SF Mono", "Consolas", monospace';
      ctx.fillText(map.name, 16, 23);

      if (Game.state === 'DIALOG' && Game.dialogQueue.length > 0) {
        drawGbaBox(12, 222, 456, 88, '#f8f8f0', '#1c2230', '#4f6d96');
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
        wrapCanvasText(Game.dialogQueue[0], 28, 248, 420, 20);
        if (Math.floor(now / 320) % 2 === 0) drawDownCursor(444, 292);
      } else if (Game.state === 'PAUSE_MENU') {
        drawGbaBox(318, 12, 150, 142, '#f8f8f0', '#1c2230', '#4f6d96');
        const opts = ['RESUME', 'USE POTION', 'SAVE GAME', 'PARTY TIP'];
        ctx.font = 'bold 12px "SF Mono", "Consolas", monospace';
        opts.forEach((lbl, idx) => {
          const oy = 40 + idx * 28;
          if (idx === Game.pauseCursor) drawRightCursor(332, oy);
          ctx.fillStyle = idx === Game.pauseCursor ? '#d93848' : '#1c2230';
          ctx.fillText(lbl, 346, oy);
        });
      } else if (Game.state === 'SHOP') {
        drawGbaBox(36, 26, 408, 200, '#f8f8f0', '#1c2230', '#3875d6');
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
        ctx.fillText('POKE MART - MONEY: $' + Game.money, 54, 52);
        SHOP_ITEMS.forEach((it, idx) => {
          const iy = 82 + idx * 30;
          const sel = idx === Game.shopCursor;
          if (sel) drawRightCursor(54, iy);
          ctx.fillStyle = sel ? '#d93848' : '#1c2230';
          ctx.fillText(it.label + ' (Own: ' + (Game.bag[it.key] || 0) + ')', 70, iy);
          ctx.fillText('$' + it.price, 368, iy);
        });
        drawGbaBox(36, 234, 408, 68, '#f8f8f0', '#1c2230', '#4f6d96');
        ctx.fillStyle = '#1c2230';
        ctx.font = '12px "SF Mono", "Consolas", monospace';
        ctx.fillText(SHOP_ITEMS[Game.shopCursor].desc, 52, 260);
        ctx.fillStyle = '#556070';
        ctx.fillText('Press A to buy, B / ESC to exit.', 52, 282);
      } else if (Game.state === 'PC_BOX') {
        drawGbaBox(36, 24, 408, 268, '#f8f8f0', '#1c2230', '#3875d6');
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
        ctx.fillText('BILL\'S PC - SWAP WITH LEAD (' + Game.party[0].name + ')', 52, 50);
        Game.pcBox.slice(0, 6).forEach((pk, idx) => {
          const iy = 80 + idx * 28;
          const sel = idx === Game.pcCursor;
          if (sel) drawRightCursor(54, iy);
          ctx.fillStyle = sel ? '#d93848' : '#1c2230';
          ctx.fillText(pk.name + '  Lv.' + pk.level + '  (' + pk.type + ')', 70, iy);
        });
        ctx.fillStyle = '#556070';
        ctx.font = '12px "SF Mono", "Consolas", monospace';
        ctx.fillText('Press A to withdraw & swap, B / ESC to close.', 52, 272);
      }
    }

    function renderHpPlate(x, y, w, h, pkm, isPlayer) {
      drawGbaBox(x, y, w, h, '#f8f8e8', '#1c2230', '#6d7b94');
      ctx.fillStyle = '#1c2230';
      ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
      ctx.fillText(pkm.name.toUpperCase(), x + 12, y + 22);

      ctx.font = 'bold 12px "SF Mono", "Consolas", monospace';
      ctx.fillText('Lv' + pkm.level, x + w - 54, y + 22);

      if (!isPlayer && Game.caught[pkm.species]) {
        ctx.fillStyle = '#d93848';
        ctx.fillRect(x + w - 70, y + 13, 8, 8);
      }

      const bx = x + 42;
      const by = y + 31;
      const bw = w - 58;
      ctx.fillStyle = '#242936';
      ctx.fillRect(x + 12, by - 1, bw + 32, 11);
      ctx.fillStyle = '#f5b942';
      ctx.font = 'bold 9px "SF Mono", "Consolas", monospace';
      ctx.fillText('HP', x + 16, by + 8);

      ctx.fillStyle = '#474f5e';
      ctx.fillRect(bx, by + 1, bw, 7);
      const ratio = Math.max(0, Math.min(1, pkm.hp / pkm.maxHp));
      ctx.fillStyle = ratio > 0.5 ? '#30c462' : (ratio > 0.22 ? '#f0a824' : '#e63946');
      ctx.fillRect(bx, by + 1, Math.floor(bw * ratio), 7);

      if (isPlayer) {
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 11px "SF Mono", "Consolas", monospace';
        ctx.fillText(pkm.hp + ' / ' + pkm.maxHp, x + w - 92, y + 56);

        const expRatio = Math.max(0, Math.min(1, pkm.xp / Math.max(1, pkm.nextXp)));
        ctx.fillStyle = '#38404f';
        ctx.fillRect(x + 12, y + h - 10, w - 24, 4);
        ctx.fillStyle = '#33a8ff';
        ctx.fillRect(x + 12, y + h - 10, Math.floor((w - 24) * expRatio), 4);
      }
    }

    function renderBattle(now) {
      const b = Game.battle;
      if (!b) return;
      const p = currentPlayer();
      const e = currentEnemy();

      ctx.fillStyle = b.isTrainer ? '#d8e4f2' : '#d6f5d6';
      ctx.fillRect(0, 0, 480, 212);
      ctx.fillStyle = b.isTrainer ? '#c2d3e8' : '#b8ebbd';
      ctx.fillRect(0, 128, 480, 84);

      ctx.fillStyle = b.isTrainer ? '#9eb2cc' : '#7fd479';
      ctx.beginPath();
      ctx.ellipse(348, 120, 74, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(124, 202, 84, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!b.enemyHidden) {
        const eOffX = b.eLunge > 0 ? -14 : 0;
        const eBob = Math.round(Math.sin(now / 200) * 2);
        if (b.eLunge > 0) b.eLunge--;
        const eWhite = b.eFlash > 0 && (b.eFlash-- % 3 === 0);
        drawPixelSprite(ctx, e.species, 312 + eOffX, 48 + eBob, 4, false, eWhite);
      }

      if (b.phase === 'BALL_ANIM' && b.ballAnim) {
        const ba = b.ballAnim;
        ba.t++;
        let bx = 120, by = 170;
        if (ba.t < 24) {
          const prog = ba.t / 24;
          bx = 120 + (344 - 120) * prog;
          by = 170 + (104 - 170) * prog - Math.sin(prog * Math.PI) * 68;
        } else {
          b.enemyHidden = true;
          bx = 344; by = 104;
          const shakeTick = ba.t - 24;
          if (shakeTick % 24 === 8 && ba.shakeDone < ba.shakes) {
            ba.shakeDone++;
            AudioEngine.playBallShake();
          }
          if (shakeTick > 24 * ba.shakes + 18) {
            finishBallAnim();
          } else {
            bx += Math.round(Math.sin(shakeTick * 0.45) * 4);
          }
        }
        ctx.fillStyle = '#1c2230';
        ctx.fillRect(bx - 9, by - 9, 18, 18);
        ctx.fillStyle = ba.itemKey === 'greatball' ? '#2c7be5' : '#e63946';
        ctx.fillRect(bx - 7, by - 7, 14, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 7, by + 1, 14, 6);
        ctx.fillRect(bx - 2, by - 2, 4, 4);
      }

      const pOffX = b.pLunge > 0 ? 16 : 0;
      const pBob = Math.round(Math.cos(now / 190) * 2);
      if (b.pLunge > 0) b.pLunge--;
      const pWhite = b.pFlash > 0 && (b.pFlash-- % 3 === 0);
      if (p.hp > 0) {
        drawPixelSprite(ctx, p.species, 82 + pOffX, 122 + pBob, 5, true, pWhite);
      }

      updateAndDrawParticles(false, 0, 0);

      renderHpPlate(16, 16, 206, 52, e, false);
      renderHpPlate(252, 134, 214, 70, p, true);

      drawGbaBox(0, 212, 480, 108, '#293242', '#141821', '#d99b26');

      if (b.phase === 'MESSAGE' || b.phase === 'BALL_ANIM') {
        drawGbaBox(10, 220, 460, 92, '#f8f8f0', '#141821', '#5c7499');
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 14px "SF Mono", "Consolas", monospace';
        const txt = b.msgQueue[0] || (b.phase === 'BALL_ANIM' ? '...' : '');
        wrapCanvasText(txt, 26, 250, 424, 22);
        if (b.phase === 'MESSAGE' && Math.floor(now / 300) % 2 === 0) {
          drawDownCursor(446, 292);
        }
      } else if (b.phase === 'MENU') {
        drawGbaBox(10, 220, 252, 92, '#f8f8f0', '#141821', '#5c7499');
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
        ctx.fillText('What will', 24, 252);
        ctx.fillText(p.name + ' do?', 24, 276);

        drawGbaBox(266, 220, 204, 92, '#ffffff', '#141821', '#5c7499');
        const cmds = ['FIGHT', 'BAG', 'POKEMON', 'RUN'];
        ctx.font = 'bold 13px "SF Mono", "Consolas", monospace';
        cmds.forEach((lbl, idx) => {
          const cx = 286 + (idx % 2) * 94;
          const cy = 254 + Math.floor(idx / 2) * 34;
          if (idx === b.menuCursor) drawRightCursor(cx - 11, cy);
          ctx.fillStyle = idx === b.menuCursor ? '#d93848' : '#1c2230';
          ctx.fillText(lbl, cx, cy);
        });
      } else if (b.phase === 'MOVES') {
        drawGbaBox(10, 220, 314, 92, '#ffffff', '#141821', '#5c7499');
        ctx.font = 'bold 12px "SF Mono", "Consolas", monospace';
        p.moves.forEach((ms, idx) => {
          const mv = MOVES[ms.key];
          const mx = 28 + (idx % 2) * 148;
          const my = 252 + Math.floor(idx / 2) * 34;
          if (idx === b.moveCursor) drawRightCursor(mx - 11, my);
          ctx.fillStyle = idx === b.moveCursor ? '#d93848' : '#1c2230';
          ctx.fillText(mv.name, mx, my);
        });

        drawGbaBox(328, 220, 142, 92, '#f8f8f0', '#141821', '#5c7499');
        const curSlot = p.moves[b.moveCursor] || p.moves[0];
        const curMv = MOVES[curSlot.key];
        ctx.fillStyle = '#1c2230';
        ctx.font = 'bold 11px "SF Mono", "Consolas", monospace';
        ctx.fillText('PP ' + curSlot.pp + '/' + curSlot.maxPp, 340, 244);
        ctx.fillStyle = TYPE_COLORS[curMv.type];
        ctx.fillText(curMv.type.toUpperCase(), 340, 264);
        const eff = curMv.power > 0 ? getEffectiveness(curMv.type, e.type) : 1;
        ctx.fillStyle = eff > 1.1 ? '#188f4e' : (eff < 0.9 ? '#b84242' : '#556070');
        ctx.font = '10px "SF Mono", "Consolas", monospace';
        ctx.fillText(eff > 1.1 ? '2x EFFECTIVE!' : (eff < 0.9 ? '0.5x RESISTED' : '1x NORMAL'), 340, 286);
      } else if (b.phase === 'BAG') {
        drawGbaBox(10, 220, 460, 92, '#ffffff', '#141821', '#5c7499');
        const entries = [
          ['pokeball', 'Poke Ball'],
          ['greatball', 'Great Ball'],
          ['potion', 'Potion (+28 HP)'],
          ['superpotion', 'Super Potion (+65)']
        ];
        ctx.font = 'bold 12px "SF Mono", "Consolas", monospace';
        entries.forEach(([k, label], idx) => {
          const ix = 28 + (idx % 2) * 220;
          const iy = 252 + Math.floor(idx / 2) * 34;
          const qty = Game.bag[k] || 0;
          if (idx === b.bagCursor) drawRightCursor(ix - 11, iy);
          ctx.fillStyle = idx === b.bagCursor ? '#d93848' : (qty > 0 ? '#1c2230' : '#96a0b3');
          ctx.fillText(label + ' x' + qty, ix, iy);
        });
      } else if (b.phase === 'PARTY') {
        drawGbaBox(10, 220, 460, 92, '#ffffff', '#141821', '#5c7499');
        ctx.font = 'bold 11px "SF Mono", "Consolas", monospace';
        Game.party.forEach((pk, idx) => {
          const ix = 26 + (idx % 2) * 220;
          const iy = 244 + Math.floor(idx / 2) * 22;
          const sel = idx === b.partyCursor;
          if (sel) drawRightCursor(ix - 10, iy);
          ctx.fillStyle = sel ? '#d93848' : (pk.hp > 0 ? '#1c2230' : '#96a0b3');
          ctx.fillText(pk.name + ' Lv' + pk.level + ' (' + pk.hp + '/' + pk.maxHp + ')', ix, iy);
        });
      }

      if (b.introWipe > 0) {
        const h = Math.floor((b.introWipe / 18) * 160);
        b.introWipe--;
        ctx.fillStyle = '#11141c';
        ctx.fillRect(0, 0, 480, h);
        ctx.fillRect(0, 320 - h, 480, h);
      }
    }

    function updateAndDrawParticles(worldOnly, camX, camY) {
      for (let i = Game.particles.length - 1; i >= 0; i--) {
        const pt = Game.particles[i];
        if (Boolean(pt.world) !== worldOnly) continue;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        ctx.fillStyle = pt.color;
        const dx = worldOnly ? (pt.x - camX) : pt.x;
        const dy = worldOnly ? (pt.y - camY) : pt.y;
        ctx.fillRect(Math.floor(dx), Math.floor(dy), pt.size, pt.size);
        if (pt.life <= 0) Game.particles.splice(i, 1);
      }
    }

    function makeSpriteDataUrl(speciesKey, size = 32) {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      drawPixelSprite(g, speciesKey, 0, 0, size / 16, false, false);
      return c.toDataURL();
    }
    const spriteUrlCache = {};
    function getSpriteUrl(sp) {
      if (!spriteUrlCache[sp]) spriteUrlCache[sp] = makeSpriteDataUrl(sp, 32);
      return spriteUrlCache[sp];
    }

    function updateHUD() {
      const zoneEl = document.getElementById('zoneLabel');
      if (zoneEl) {
        zoneEl.textContent = Game.state === 'STARTER'
          ? 'OAK\'S LAB'
          : (Game.state === 'BATTLE' ? 'IN BATTLE' : MAPS[Game.mapId].name);
      }
      const moneyEl = document.getElementById('moneyDisplay');
      if (moneyEl) moneyEl.textContent = '$' + Game.money;
      const pcEl = document.getElementById('pcBoxDisplay');
      if (pcEl) pcEl.textContent = 'PC Box: ' + Game.pcBox.length;

      const badgePill = document.getElementById('badgePill');
      if (badgePill) {
        if (Game.flags.boulderBadge) {
          badgePill.textContent = 'BOULDER BADGE: EARNED';
          badgePill.classList.add('earned');
        } else {
          badgePill.textContent = 'BOULDER BADGE: LOCKED';
          badgePill.classList.remove('earned');
        }
      }

      const partyEl = document.getElementById('partyList');
      if (partyEl) {
        partyEl.innerHTML = '';
        if (Game.party.length === 0) {
          const hint = document.createElement('div');
          hint.className = 'empty-hint';
          hint.textContent = 'Choose your starter Pokemon on the GBA screen to begin!';
          partyEl.appendChild(hint);
        } else {
          Game.party.forEach((pkm, idx) => {
            const row = document.createElement('div');
            const isLead = (Game.state === 'BATTLE' && Game.battle ? idx === Game.battle.playerIdx : idx === 0);
            row.className = 'party-slot' + (isLead ? ' lead-slot' : '') + (pkm.hp <= 0 ? ' fainted-slot' : '');

            const img = document.createElement('img');
            img.className = 'mini-sprite';
            img.src = getSpriteUrl(pkm.species);
            img.alt = pkm.name;

            const info = document.createElement('div');
            info.className = 'slot-info';

            const top = document.createElement('div');
            top.className = 'slot-top';
            const nm = document.createElement('span');
            nm.className = 'slot-name';
            nm.textContent = pkm.name + ' (' + pkm.type + ')';
            const lv = document.createElement('span');
            lv.className = 'slot-lvl';
            lv.textContent = 'Lv.' + pkm.level;
            top.appendChild(nm);
            top.appendChild(lv);

            const barTrack = document.createElement('div');
            barTrack.className = 'bar-track';
            const barFill = document.createElement('div');
            const hpPct = Math.max(0, Math.min(100, Math.round((pkm.hp / pkm.maxHp) * 100)));
            barFill.className = 'bar-fill' + (hpPct <= 22 ? ' hp-low' : (hpPct <= 50 ? ' hp-mid' : ''));
            barFill.style.width = hpPct + '%';
            barTrack.appendChild(barFill);

            const xpTrack = document.createElement('div');
            xpTrack.className = 'xp-track';
            const xpFill = document.createElement('div');
            xpFill.className = 'xp-fill';
            xpFill.style.width = Math.min(100, Math.round((pkm.xp / Math.max(1, pkm.nextXp)) * 100)) + '%';
            xpTrack.appendChild(xpFill);

            info.appendChild(top);
            info.appendChild(barTrack);
            info.appendChild(xpTrack);

            const hpTxt = document.createElement('div');
            hpTxt.className = 'slot-hp-num';
            hpTxt.textContent = pkm.hp + '/' + pkm.maxHp;

            row.appendChild(img);
            row.appendChild(info);
            row.appendChild(hpTxt);

            row.addEventListener('click', () => {
              if (Game.state === 'OVERWORLD' && idx > 0 && pkm.hp > 0) {
                const chosen = Game.party.splice(idx, 1)[0];
                Game.party.unshift(chosen);
                AudioEngine.playConfirm();
                saveGame();
                updateHUD();
              } else if (Game.state === 'BATTLE' && Game.battle && (Game.battle.phase === 'MENU' || Game.battle.phase === 'PARTY')) {
                if (idx !== Game.battle.playerIdx && pkm.hp > 0) {
                  if (Game.battle.forceSwitch) {
                    Game.battle.forceSwitch = false;
                    Game.battle.playerIdx = idx;
                    AudioEngine.playConfirm();
                    updateHUD();
                    queueBattleMsg(['Go! ' + currentPlayer().name + '!'], () => { Game.battle.phase = 'MENU'; });
                  } else {
                    executeTurn({ kind: 'SWITCH', targetIdx: idx });
                  }
                }
              }
            });

            partyEl.appendChild(row);
          });
        }
      }

      const bagEl = document.getElementById('bagGrid');
      if (bagEl) {
        bagEl.innerHTML = '';
        [['pokeball', 'Poke Ball'], ['greatball', 'Great Ball'], ['potion', 'Potion'], ['superpotion', 'Super Potion']]
          .forEach(([k, label]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bag-item-btn';
            const lSpan = document.createElement('span');
            lSpan.textContent = label;
            const qSpan = document.createElement('span');
            qSpan.className = 'bag-qty';
            qSpan.textContent = 'x' + (Game.bag[k] || 0);
            btn.appendChild(lSpan);
            btn.appendChild(qSpan);

            btn.addEventListener('click', () => {
              if (Game.state === 'OVERWORLD') {
                if (k === 'potion' || k === 'superpotion') useOverworldPotion(k);
                else showDialog(['Poke Balls can only be thrown during wild Pokemon battles!']);
              } else if (Game.state === 'BATTLE' && Game.battle && (Game.battle.phase === 'MENU' || Game.battle.phase === 'BAG')) {
                if ((Game.bag[k] || 0) > 0) executeTurn({ kind: 'ITEM', itemKey: k });
                else AudioEngine.playCancel();
              }
            });
            bagEl.appendChild(btn);
          });
      }

      const dexEl = document.getElementById('dexGrid');
      const dexCountEl = document.getElementById('dexCountDisplay');
      let caughtTotal = 0;
      if (dexEl) {
        dexEl.innerHTML = '';
        DEX_ORDER.forEach(sp => {
          const isCaught = Boolean(Game.caught[sp]);
          const isSeen = Boolean(Game.seen[sp]);
          if (isCaught) caughtTotal++;

          const cell = document.createElement('div');
          cell.className = 'dex-cell' + (isCaught ? ' caught' : '');

          const img = document.createElement('img');
          img.className = 'dex-icon' + (!isSeen ? ' dex-unknown' : '');
          img.src = getSpriteUrl(sp);
          img.alt = isSeen ? SPECIES[sp].name : 'Unknown';

          const lbl = document.createElement('span');
          lbl.className = 'dex-name';
          lbl.textContent = isSeen ? SPECIES[sp].name : '???';

          cell.appendChild(img);
          cell.appendChild(lbl);
          dexEl.appendChild(cell);
        });
      }
      if (dexCountEl) dexCountEl.textContent = caughtTotal + ' / ' + DEX_ORDER.length + ' Caught';
    }

    const KEY_MAP = {
      ArrowUp: 'UP', KeyW: 'UP',
      ArrowDown: 'DOWN', KeyS: 'DOWN',
      ArrowLeft: 'LEFT', KeyA: 'LEFT',
      ArrowRight: 'RIGHT', KeyD: 'RIGHT',
      KeyZ: 'A', Enter: 'A', Space: 'A',
      KeyX: 'B', Escape: 'B', Backspace: 'B',
      KeyM: 'START', KeyI: 'START'
    };

    window.addEventListener('keydown', e => {
      const mapped = KEY_MAP[e.code] || KEY_MAP[e.key];
      if (!mapped) return;
      e.preventDefault();
      if (mapped === 'UP' || mapped === 'DOWN' || mapped === 'LEFT' || mapped === 'RIGHT') {
        if (!heldDirs.includes(mapped)) heldDirs.unshift(mapped);
        if (Game.state !== 'OVERWORLD') handleCommand(mapped);
      } else {
        handleCommand(mapped);
      }
    });

    window.addEventListener('keyup', e => {
      const mapped = KEY_MAP[e.code] || KEY_MAP[e.key];
      const idx = heldDirs.indexOf(mapped);
      if (idx >= 0) heldDirs.splice(idx, 1);
    });

    document.querySelectorAll('[data-key]').forEach(btn => {
      const k = btn.getAttribute('data-key');
      const isDir = (k === 'UP' || k === 'DOWN' || k === 'LEFT' || k === 'RIGHT');

      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (isDir) {
          if (!heldDirs.includes(k)) heldDirs.unshift(k);
          if (Game.state !== 'OVERWORLD') handleCommand(k);
        } else {
          handleCommand(k);
        }
      });

      const clearDir = () => {
        const idx = heldDirs.indexOf(k);
        if (idx >= 0) heldDirs.splice(idx, 1);
      };
      btn.addEventListener('pointerup', clearDir);
      btn.addEventListener('pointerleave', clearDir);
      btn.addEventListener('pointercancel', clearDir);
    });

    canvas.addEventListener('click', e => {
      document.getElementById('consoleFrame').focus();
      const rect = canvas.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * 480;
      const cy = ((e.clientY - rect.top) / rect.height) * 320;

      if (Game.state === 'STARTER') {
        for (let i = 0; i < 4; i++) {
          const bx = 26 + i * 109;
          if (cx >= bx && cx <= bx + 98 && cy >= 82 && cy <= 216) {
            if (Game.starterIdx === i) selectStarter(i);
            else { Game.starterIdx = i; AudioEngine.playBlip(); }
            return;
          }
        }
        if (cy > 224) selectStarter(Game.starterIdx);
        return;
      }

      if (Game.state === 'DIALOG') { advanceDialog(); return; }

      if (Game.state === 'BATTLE' && Game.battle) {
        const b = Game.battle;
        if (b.phase === 'MESSAGE') advanceBattleMsg();
        else if (b.phase === 'MENU' && cx >= 266 && cy >= 220) {
          const col = cx >= 368 ? 1 : 0;
          const row = cy >= 266 ? 1 : 0;
          b.menuCursor = row * 2 + col;
          handleBattleInput('A');
        } else if (b.phase === 'MOVES' && cx <= 324 && cy >= 220) {
          const col = cx >= 168 ? 1 : 0;
          const row = cy >= 266 ? 1 : 0;
          const idx = row * 2 + col;
          if (idx < currentPlayer().moves.length) {
            b.moveCursor = idx;
            handleBattleInput('A');
          }
        }
      }
    });

    const sfxBtn = document.getElementById('sfxToggleBtn');
    sfxBtn.addEventListener('click', () => {
      AudioEngine.sfxEnabled = !AudioEngine.sfxEnabled;
      sfxBtn.textContent = AudioEngine.sfxEnabled ? 'SFX: ON' : 'SFX: OFF';
      sfxBtn.classList.toggle('active-toggle', AudioEngine.sfxEnabled);
      if (AudioEngine.sfxEnabled) AudioEngine.playConfirm();
    });

    const bgmBtn = document.getElementById('bgmToggleBtn');
    bgmBtn.addEventListener('click', () => {
      const next = !AudioEngine.bgmEnabled;
      AudioEngine.toggleBgm(next);
      bgmBtn.textContent = next ? 'BGM: ON' : 'BGM: OFF';
      bgmBtn.classList.toggle('active-toggle', next);
    });

    const newGameBtn = document.getElementById('newGameBtn');
    newGameBtn.addEventListener('click', () => {
      if (!Game.confirmReset) {
        Game.confirmReset = true;
        newGameBtn.textContent = 'CONFIRM RESET?';
        newGameBtn.classList.add('danger-confirm');
        setTimeout(() => {
          Game.confirmReset = false;
          newGameBtn.textContent = 'NEW GAME';
          newGameBtn.classList.remove('danger-confirm');
        }, 3200);
      } else {
        Game.confirmReset = false;
        newGameBtn.textContent = 'NEW GAME';
        newGameBtn.classList.remove('danger-confirm');
        AudioEngine.playCancel();
        resetGame();
      }
    });

    buildTiles();
    loadGame();
    updateHUD();

    let lastTime = performance.now();
    function loop(now) {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      if (Game.state === 'OVERWORLD' && !Game.moveAnim && heldDirs.length > 0) {
        tryMovePlayer(heldDirs[0]);
      }

      if (Game.state === 'STARTER') renderStarterScreen(now);
      else if (Game.state === 'BATTLE') renderBattle(now);
      else renderOverworld(now, dt);

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();
