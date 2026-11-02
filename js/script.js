var form = document.getElementById('searchForm');

['minPrice', 'maxPrice'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
        var digits = this.value.replace(/\D/g, '');
        this.value = digits ? Number(digits).toLocaleString('en-US') : '';
    });
});

form.addEventListener('submit', function (e) {
    e.preventDefault();
    var params = new URLSearchParams(new FormData(form));
    ['minPrice', 'maxPrice'].forEach(function (k) {
        params.set(k, (params.get(k) || '').replace(/,/g, ''));
    });
    console.log('Search params:', params.toString());
});

(function () {
    var gallery = document.getElementById('lifeGallery');
    var scroller = document.getElementById('lifeScroller');
    var track = scroller.querySelector('.life-track');
    var originals = Array.from(track.children);
    var N = originals.length;
    var COPIES = 3;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SPEED = reduceMotion ? 0 : 35;

    for (var k = 1; k < COPIES; k++) {
        originals.forEach(function (img) {
            var copy = img.cloneNode(true);
            copy.alt = '';
            copy.tabIndex = -1;
            copy.removeAttribute('role');
            copy.setAttribute('aria-hidden', 'true');
            track.appendChild(copy);
        });
    }

    var setW = 0;
    function measure() { setW = track.scrollWidth / COPIES; }
    function wrap() {
        if (!setW) return;
        if (scroller.scrollLeft < setW) scroller.scrollLeft += setW;
        else if (scroller.scrollLeft >= 2 * setW) scroller.scrollLeft -= setW;
    }
    measure();
    scroller.scrollLeft = setW;
    scroller.addEventListener('scroll', wrap, { passive: true });

    //pause the automatic movement
    var hovering = false, focused = false, isDown = false, moved = false;
    var inView = true, lbOpen = false, pausedUntil = 0;
    var anim = null, pos = setW, lastT = 0;

    function holdAuto(ms) { pausedUntil = Date.now() + ms; }
    function isPaused() {
        return hovering || focused || isDown || lbOpen || !inView ||
            document.hidden || Date.now() < pausedUntil;
    }

    gallery.addEventListener('mouseenter', function () { hovering = true; });
    gallery.addEventListener('mouseleave', function () { hovering = false; });
    gallery.addEventListener('focusin', function (e) {
        focused = e.target.matches(':focus-visible');
    });
    gallery.addEventListener('focusout', function () { focused = false; });
    ['touchstart', 'touchmove', 'touchend', 'wheel'].forEach(function (ev) {
        scroller.addEventListener(ev, function () { holdAuto(4000); anim = null; }, { passive: true });
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
        }).observe(gallery);
    }

    function apply() {
        while (pos >= 2 * setW) pos -= setW;
        while (pos < setW) pos += setW;
        scroller.scrollLeft = pos;
    }

    function frame(t) {
        var dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0;
        lastT = t;
        if (anim) {
            var p = anim.dur ? Math.min(1, (performance.now() - anim.start) / anim.dur) : 1;
            pos = anim.from + anim.delta * (1 - Math.pow(1 - p, 3));
            apply();
            if (p >= 1) anim = null;
        } else if (!SPEED || isPaused()) {
            pos = scroller.scrollLeft;
        } else {
            var sl = scroller.scrollLeft;
            if (Math.abs(sl - pos) > 2) pos = sl;
            pos += SPEED * dt;
            apply();
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.addEventListener('resize', function () {
        measure(); wrap(); pos = scroller.scrollLeft;
    });

    function slide(dir) {
        holdAuto(4000);
        anim = {
            from: scroller.scrollLeft,
            delta: dir * Math.round(scroller.clientWidth * 0.7),
            start: performance.now(),
            dur: reduceMotion ? 0 : 550
        };
    }
    gallery.querySelector('.life-prev').addEventListener('click', function () { slide(-1); });
    gallery.querySelector('.life-next').addEventListener('click', function () { slide(1); });

    var startX = 0, lastX = 0;
    scroller.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        isDown = true; moved = false; anim = null;
        startX = lastX = e.pageX;
    });
    window.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        if (!moved && Math.abs(e.pageX - startX) > 5) {
            moved = true;
            scroller.classList.add('dragging');
        }
        if (moved) {
            e.preventDefault();
            scroller.scrollLeft -= e.pageX - lastX;
        }
        lastX = e.pageX;
    });
    window.addEventListener('mouseup', function () {
        isDown = false;
        scroller.classList.remove('dragging');
    });

    var lb = document.getElementById('lightbox');
    var lbImg = document.getElementById('lbImg');
    var lbCap = document.getElementById('lbCap');
    var lbButtons = Array.from(lb.querySelectorAll('.lb-btn'));
    var current = 0, lastFocus = null;

    function show(i) {
        current = (i + N) % N;
        var src = originals[current];
        lbImg.src = src.getAttribute('data-full') || src.src;
        lbImg.alt = src.alt;
        lbCap.textContent = src.alt;
    }
    function openLb(i) {
        lastFocus = document.activeElement;
        show(i);
        lb.hidden = false;
        lbOpen = true;
        document.body.classList.add('lb-open');
        lb.querySelector('.lb-close').focus();
    }
    function closeLb() {
        lb.hidden = true;
        lbOpen = false;
        lbImg.src = '';
        document.body.classList.remove('lb-open');
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    scroller.addEventListener('click', function (e) {
        if (moved) { moved = false; return; }
        var img = e.target.closest('img');
        if (!img) return;
        openLb(Array.prototype.indexOf.call(track.children, img) % N);
    });
    scroller.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.tagName === 'IMG') {
            e.preventDefault();
            openLb(Array.prototype.indexOf.call(track.children, e.target) % N);
        }
    });

    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('lb-figure')) closeLb();
    });
    document.addEventListener('keydown', function (e) {
        if (lb.hidden) return;
        if (e.key === 'Escape') closeLb();
        else if (e.key === 'ArrowLeft') show(current - 1);
        else if (e.key === 'ArrowRight') show(current + 1);
        else if (e.key === 'Tab') {
            var first = lbButtons[0], last = lbButtons[lbButtons.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
})();

(function () {
    var nav = document.querySelector('.pill-nav');
    var list = nav.querySelector('ul');
    var left = nav.querySelector('.nav-arrow-left');
    var right = nav.querySelector('.nav-arrow-right');

    function update() {
        var max = list.scrollWidth - list.clientWidth;
        nav.classList.toggle('can-left', list.scrollLeft > 4);
        nav.classList.toggle('can-right', max > 4 && list.scrollLeft < max - 4);
    }
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();

    left.addEventListener('click', function () { list.scrollBy({ left: -150, behavior: 'smooth' }); });
    right.addEventListener('click', function () { list.scrollBy({ left: 150, behavior: 'smooth' }); });
})();

document.getElementById('footerYear').textContent = new Date().getFullYear();

var contactForm = document.getElementById('contactForm');
var contactStatus = document.getElementById('contactStatus');
contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!contactForm.checkValidity()) {
        contactStatus.textContent = 'Please complete every field.';
        return;
    }
    contactStatus.textContent = 'Thank you. Marci will be in touch soon.';
    contactForm.reset();
});