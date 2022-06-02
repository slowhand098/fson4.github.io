"use strict"
let tasks = ["numeral", "arrow", "ABC"],
	time = { medium: 1500, hard: 210 },
	reverse = { numeral: 0, arrow: "0-1", ABC: 0 },
	random = { numeral: 1, arrow: 1, ABC: 0 },
	sound = 1,
	range = { min: 5, max: 9 },
	board, key, grid, index, limit, mode, clone, score, time1, time2

const audio = new AudioContext(),
	layout = new DocumentFragment(),
	$ = sel => board.querySelector(sel),
	create = (tag, parentNode, className) => {
		const el = document.createElement(tag)
		if (parentNode) parentNode.append(el)
		if (className) el.className = className
		return el
	},
	ocillate = props => {
		if (!sound) return
		if (audio.state === "suspended") audio.resume()
		const p = Object.assign({ wave: "sine", gain: .2, ramp: !0, start: 0 }, props),
			o = new OscillatorNode(audio, { type: p.wave, frequency: p.freq }),
			g = new GainNode(audio, { gain: p.gain })
		g.gain.setValueAtTime(p.gain, audio.currentTime + p.start + .01)
		if (p.ramp) g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + p.stop)
		o.connect(g).connect(audio.destination)
		o.start(audio.currentTime + p.start)
		o.stop(audio.currentTime + p.stop)
	},
	playPress = () => {
		ocillate({ freq: 540, stop: .1 })
	},
	playAlert = () => {
		let d = .09, [a, b] = [-d, -.05 + d]
		for (let i = 0; i < 7; ++i) ocillate({ freq: 1600, start: a += d, stop: b += d })
	},
	playBuzzer = () => {
		ocillate({ wave: "sawtooth", freq: 140, gain: .18, ramp: !1, stop: .6 })
	},
	prep = controls => {
		while (board.firstChild) board.firstChild.remove()
		if (controls) return (board.className = key)
		let [a, b] = [1, 0]
		const lsc = innerWidth > innerHeight
		grid = Array.from({ length: range.xyMin * range.xyMax }, () => {
			if (b === range.xyMax) [a, b] = [++a, 0]; return lsc ? a + "/" + (++b) : (++b) + "/" + a })
		index = Array.from({ length: limit }, (v, i) => i)
		board.className = "grid"
	},
	ctrl = (tag, className, txt, func, parentNode = layout, active = !1) => {
		for (const [i, c] of className.entries()) {
			const el = create(tag, parentNode, c)
			el.textContent = txt[i]
			el.addEventListener("pointerdown", () => { playPress(); el.classList.add("active"); active = !0
				document.addEventListener("pointerup", () => { el.classList.remove("active"); active = !1 }, { once: !0 }) })
			el.addEventListener("pointerup", () => { if (active) { el.classList.remove("active"); active = !1; func[i](el) }})
		}
	},
	main = () => {
		prep(!0)
		const help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Choose difficulty", "Start task on the circle", "Observe " + key + "s", "Press the right order"])
					create("li", el.firstChild).textContent = txt
			},
			speaker = prssd => { if (prssd) sound = !sound; return sound ? "🔊" : "🔇" },
			alt = () => { board.className = (key = tasks.find((k, i, a) => { let o = a.indexOf(key) + 1; if (o === a.length) o = 0; return i === o }))
				help($(".help"), !0) },
			menu = el => { mode = el.textContent.toLowerCase(); start() },
			dwnl = () => open("https://github.com/fson4/fson4.github.io", "_blank"),
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		[limit, score, run.n] = [range.min, 0, 0]
		ctrl("p", ["help", "alt", "dwnl"], ["?", "⎇", ""], [el => help(el), alt, dwnl])
		ctrl("div", ["speaker"], [speaker()], [el => el.textContent = speaker(!0)])
		ctrl("li", Array(3), ["Easy", "Medium", "Hard"], Array(3).fill(el => menu(el)), create("ul", layout, "menu"))
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	start = () => {
		prep(!0)
		const level = prssd => {
				if (prssd) {
					[limit, score, run.n] = [limit === range.max ? range.min : ++limit, 0, 0]
					try { $(".result").remove() } catch { /*0*/ }
				}
				return "Level " + limit
			}
		ctrl("p", ["level", "return"], [level(), "Return"], [el => el.textContent = level(!0), main])
		ctrl("div", ["circle"], [""], [task])
		board.append(layout)
		if (/-|^$/.test(reverse[key])) {
			reverse[key] = Math.floor(Math.random() * 2) ? "-" : ""
			$(".circle").classList.add(reverse[key] ? "minus" : "plus", "marker")
		}
	},
	result = (box, stm) => {
		const data = () => Math.round((score / run.n) * 100) + "% (" + score + " / " + run.n + ")"
		if (!index.length) {
			++score
			const ul = create("ul", layout, "result success")
			for (const txt of ["- Well Played -", data(), Math.round((time2 - time1) / 10) / 100 + " sec"]) create("li", ul).textContent = txt
			start()
			playAlert()
		} else {
			box.className = "box red"
			box.append(stm)
			playBuzzer()
			create("li", create("ul", layout, "result")).textContent = data()
			setTimeout(start, 800)
		}
	},
	build = () => {
		const place = stm => {
				const box = create("div", layout, "box")
				box.style.gridArea = grid.splice(Math.floor(Math.random() * grid.length), 1)[0]
				box.append(stm)
				return stm
			},
			chrs = stm => {
				const s = Array.from({ length: range.max }, stm)
				if (random[key]) while (s.length > limit) s.splice(Math.floor(Math.random() * s.length), 1)
				for (let i = 0; i < limit;) place(s[i++])
			},
			arrows = () => {
				const sector = Number((360 / limit).toFixed(2))
				for (let i = 0, deg = random[key] ? sector - 4 : sector; i < limit; ++i, deg += sector)
					place(create("div")).style.transform = "rotate(" + Math.round(random[key] ?
					deg - Math.floor(Math.random() * (sector - 7)) : deg - (sector / 2)) + "deg)"
			}
		switch (key) {
			case "numeral": chrs((v, i) => i + 1); break
			case "arrow": arrows(); break
			case "ABC": chrs((v, i) => String.fromCharCode(i + 65))
		}
	},
	mask = () => {
		time2 = performance.now()
		for (const box of board.children) {
			box.firstChild.remove()
			box.className = "box mask"
		}
		board.addEventListener("pointerdown", unmask)
	},
	unmask = (e, box = e.target.closest(".mask")) => {
		if (!box) return
		box.className = "box"
		const i = [...board.children].indexOf(box)
		if (i !== (reverse[key] ? index.pop() : index.shift()) || !index.length) {
			board.removeEventListener("pointerdown", unmask)
			result(box, clone.children[i].firstChild)
		} else playPress()
	},
	masker = (e, box = e.target.closest(".box")) => {
		if (!box) return
		board.removeEventListener("pointerdown", masker)
		mask()
		unmask(e, box)
	},
	run = () => {
		++run.n
		clone = layout.cloneNode(!0)
		board.append(layout)
		time1 = performance.now()
		if (mode !== "easy") setTimeout(mask, time[mode])
		else board.addEventListener("pointerdown", masker)
	},
	task = () => { prep(); build();	run() }
addEventListener("DOMContentLoaded", () => {
	[board, key, range.xyMin, range.xyMax] = [document.body, tasks[0], 5, 8]
	main()
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js")
}, { once: !0 })
