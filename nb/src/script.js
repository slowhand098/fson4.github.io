"use strict"
let block = { a: 12, b: 20, c: 40 },
	targets = { a: 3, b: 6, c: 12 },
	overlap = { a: 1, b: 2, c: 4, control: 1 },
	time = { rate: 3000, stimulus: 500 },
	[dual, sound, buttons] = [1, 1, 1],
	range = { min: 1, max: 6, N: 2 },
	aural = ["c", "f", "g", "j", "k", "p", "q", "w"],
	board, key, grid, visual, vMatch, aMatch, vBlock, aBlock, N, olap, seq, delay, idle, wl

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
		const p = Object.assign({ wave: "sine", gain: .2, start: 0 }, props),
			o = new OscillatorNode(audio, { type: p.wave, frequency: p.freq }),
			g = new GainNode(audio, { gain: p.gain })
		g.gain.setValueAtTime(p.gain, audio.currentTime + p.start + .01)
		g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + p.stop)
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
	clearSeq = () => {
		clearInterval(seq)
		clearTimeout(delay)
		;[seq, delay] = [!1, !1]
		;[...grid.children].forEach(el => el.classList.remove("visual"))
		if (speechSynthesis.speaking) speechSynthesis.cancel()
		if (wl) wl.release().then(() => wl = !1)
		delete btn.fired
	},
	prep = () => {
		[...board.children].forEach(el => { if (el.className !== "grid") el.remove() })
		while (board.firstChild && board.firstChild.nodeValue) board.firstChild.remove()
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
	init = () => {
		grid = create("div", layout, "grid")
		for (let i = 0, n = 0; i < 9;) {
			if (i++ === 4) { ctrl("div", ["circle"], [""], [task], grid); continue }
			create("div", grid, "box no-" + (++n))
			visual.push(".no-" + n)
		}
		main()
		board.style.setProperty("--stm", time.stimulus / 1000 + "s")
		document.addEventListener("keydown", keyDwn)
	},
	main = () => {
		prep()
		const clear = () => {
				try { $(".result").remove() } catch { /*0*/ }
				try { help($(".help"), !0) } catch { /*0*/ }
			},
			setN = prssd => {
				if (prssd) { N = N === range.max ? range.min : ++N; clear() }
				return N + " back"
			},
			speaker = prssd => { if (prssd) sound = !sound; clear(); return sound ? "🔊" : "🔇" },
			setB = prssd => {
				if (prssd) { key = Object.keys(block).find((v, i, a) => { let o = a.indexOf(key) + 1; if (o === a.length) o = 0; return i === o }); clear() }
				return "X " + block[key]
			},
			help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Start task on the circle", "Note visual" + (sound && dual ? " and aural" : "") + " stimuli", "Match " +
					N + " state" + (N > 1 ? "s" : "") + " back", "End task on the center cross"]) create("li", el.firstChild).textContent = txt
			},
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		[btn.right, btn.wrong, run.n, idle] = [0, 0, -1, !1]
		ctrl("p", ["set-n", "set-b", "help"], [setN(), setB(), "?"], [el => el.textContent = setN(!0), el => el.textContent = setB(!0), el => help(el)])
		ctrl("div", ["speaker"], [speaker()], [el => el.textContent = speaker(!0)])
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	result = () => {
		const ul = create("ul", board, "result"), r = btn.right - btn.wrong, t = sound && dual ? targets[key] * 2 : targets[key]
		for (const txt of ["Index: " + (r > 0 ? Math.round((r / t) * 100) : 0) + "%", "Right press: " + btn.right + " / "  + t, "Wrong press: " + btn.wrong])
			create("li", ul).textContent = txt
		if (!idle) playAlert()
	},
	speak = (txt = " ") => {
		const msg = new SpeechSynthesisUtterance(txt)
		;[msg.lang, msg.rate] = [navigator.language, 1.1]
		speechSynthesis.speak(msg)
	},
	build = (stim, olCtrl) => {
		if (N + targets[key] >= block[key] - (targets[key] - overlap[key])) return board.prepend("[unsound value] ")
		let t = new Set(olCtrl ? olap.splice(0, overlap[key]) : [])
		const s = Array(block[key]),
			sample = () => stim[Math.floor(Math.random() * stim.length)]
		while (t.size < targets[key]) {
			const tIndex = Math.floor(Math.random() * (block[key] - N) + N)
			if (!(olCtrl && olap.includes(tIndex))) t.add(tIndex)
		}
		[olap, t] = [[...t], [...t].sort((a, b) => a - b)]
		for (let idx = 0; idx < targets[key]; ++idx) {
			let i = t[idx], stm = sample()
			while (stm === s[i - (N * 2)]) stm = sample()
			if (s[i - N]) stm = s[i - N]
			;[s[i - N], s[i]] = [stm, stm]
		}
		for (let i = 0; i < block[key]; ++i) while (!s[i]) {
				const stm = sample()
				if (stm !== s[i - N] && stm !== s[i + N]) s[i] = stm
			}
		return s
	},
	btn = (match, but) => {
		if (!btn.fired || btn.fired[but]) return
		if (match) ++btn.right
		else ++btn.wrong
		btn.fired[but] = !0
	},
	keyDwn = e => {
		if (e.repeat) return
		switch (e.code) {
			case "KeyA": btn(vMatch, "A"); break
			case "KeyL": if (sound && dual) btn(aMatch, "L"); break
			case "Space": task()
		}
	},
	run = () => {
		if (++run.n === block[key]) { clearSeq(); return result() }
		btn.fired = { A: !1, L: !1 }
		const vStm = vBlock[run.n],
			aStm = aBlock[run.n],
			el = $(vStm)
		vMatch = vStm === vBlock[run.n - N]
		aMatch = aStm === aBlock[run.n - N]
		if (idle) return
		requestAnimationFrame(() => {
			el.classList.add("visual")
			if (sound && dual) speak(aStm)
		})
		el.addEventListener("animationend", () => el.classList.remove("visual"), { once: !0 })
	},
	task = () => {
		if (board.classList.contains("task")) { clearSeq(); board.className = ""; return main() }
		prep()
		speak()
		board.classList.add("task", "trfx")
		if (buttons)
			ctrl("li", sound && dual ? ["btn-A", "btn-L"] : ["btn-A"], ["", ""], [() => btn(vMatch, "A"), () => btn(aMatch, "L")], create("ul", board, "buttons"))
		vBlock = build(visual)
		aBlock = (sound && dual) ? build(aural, overlap.control) : aural
		$(".circle").addEventListener("animationend", () => {
			board.classList.remove("trfx")
			if (seq || delay) clearSeq()
			wake()
			delay = setTimeout(() => { run(); seq = setInterval(run, time.rate) }, 1500)
		}, { once: !0 })
	},
	wake = async () => { try { wl = await navigator.wakeLock.request("screen") } catch { /*0*/ }}
addEventListener("DOMContentLoaded", () => {
	[board, key, visual, N] = [document.body, Object.keys(block)[0], [], range.N]
	init()
	document.addEventListener("visibilitychange", () => idle = document.visibilityState === "hidden" ? !0 : !1)
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js")
}, { once: !0 })
