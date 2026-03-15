document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const viewLanding = document.getElementById('view-landing');
    const viewTerminal = document.getElementById('view-terminal');
    const viewDashboard = document.getElementById('view-dashboard');
    
    const btnEnterDashboard = document.getElementById('btn-enter-dashboard');
    const btnLandingSearch = document.getElementById('btn-landing-search');
    const landingSearchInput = document.getElementById('landing-search');
    
    // Terminal Elements
    const terminalBody = document.getElementById('terminal-body');
    const navSyncStatus = document.getElementById('nav-sync-status');
    const navLastUpdate = document.getElementById('nav-last-update');
    
    // Dashboard Elements
    const osintFeed = document.getElementById('osint-feed');
    const redFlagsContainer = document.getElementById('red-flags-container');
    const timelineContainer = document.getElementById('timeline-container');
    const headerArticleCount = document.getElementById('header-article-count');
    const btnSyncData = document.getElementById('btn-sync-data');
    const syncFloaterSpinner = document.getElementById('sync-floater-spinner');
    
    // Profiler Elements
    const inputProfiler = document.getElementById('input-profiler');
    const btnProfilerSearch = document.getElementById('btn-profiler-search');
    const profilerModal = document.getElementById('profiler-modal');
    const btnCloseProfiler = document.getElementById('btn-close-profiler');
    const profilerResultBody = document.getElementById('profiler-result-body');

    // Navigation Elements
    const btnHome = document.getElementById('btn-home');

    // Changelog Elements
    const btnChangelog = document.getElementById('btn-changelog');
    const changelogModal = document.getElementById('changelog-modal');
    const btnCloseChangelog = document.getElementById('btn-close-changelog');

    // Dapil Elements
    const btnDapilSearch = document.getElementById('btn-dapil-search');
    const inputDapil = document.getElementById('input-dapil');

    // Phase 3 Elements
    const btnGenerateSitrep = document.getElementById('btn-generate-sitrep');
    const inputFlipflop = document.getElementById('input-flipflop');
    const btnFlipflopSearch = document.getElementById('btn-flipflop-search');
    const inputWhatif = document.getElementById('input-whatif');
    const btnWhatifSearch = document.getElementById('btn-whatif-search');
    const btnGenerateGraph = document.getElementById('btn-generate-graph');
    
    // Generic Modal Elements
    const genericModal = document.getElementById('generic-modal');
    const genericModalTitle = document.getElementById('generic-modal-title');
    const genericModalBody = document.getElementById('generic-modal-body');
    const btnCloseGeneric = document.getElementById('btn-close-generic');

    // --- Skeleton Loader ---
    const showOsintSkeleton = () => {
        headerArticleCount.textContent = '— Artikel';
        osintFeed.innerHTML = Array(6).fill('').map(() => `
            <div class="osint-card skeleton-card">
                <div class="skeleton-line" style="width:90%; height:13px; margin-bottom:8px;"></div>
                <div class="skeleton-line" style="width:50%; height:11px; margin-bottom:6px;"></div>
                <div class="skeleton-line" style="width:65%; height:10px;"></div>
            </div>
        `).join('');
    };

    // --- State Management ---
    const showView = (viewEl) => {
        [viewLanding, viewTerminal, viewDashboard].forEach(v => v.style.display = 'none');
        viewEl.style.display = 'block';
    };

    // --- Terminal Typewriter Effect ---
    const runTerminalSequence = async (onComplete) => {
        showView(viewTerminal);
        terminalBody.innerHTML = '';
        
        const sequence = [
            '> [SYSTEM] Memulai inisialisasi sinkronisasi data OSINT...',
            '> [NETWORK] Mengambil 100 berita terbaru dari Google News RSS...',
            '> [AI_ENGINE] Menganalisis entitas dan relasi politik (Proses intensif)...',
            '> [AI_ENGINE] Menyusun ringkasan eksekutif & legal grounding...',
            '> [AI_ENGINE] Mendeteksi Red Flags dan anomali integritas...',
            '> _'
        ];

        const delay = ms => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < sequence.length; i++) {
            await delay(800 + Math.random() * 700); // Random delay between 800-1500ms
            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = sequence[i];
            terminalBody.appendChild(line);
        }
        
        await delay(1000);
        if (onComplete) onComplete();
    };

    // --- Data Fetching & Rendering ---
    const fetchDashboardData = async () => {
        showOsintSkeleton();
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'API Error');
            renderDashboard(data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data dari server: ' + err.message);
            // Fallback to dashboard with empty state so user doesn't get stuck in terminal
            showView(viewDashboard);
            navSyncStatus.style.display = 'none';
            syncFloaterSpinner.style.display = 'none';
        }
    };

    const renderDashboard = (data) => {
        // Hide spinners
        navSyncStatus.style.display = 'none';
        syncFloaterSpinner.style.display = 'none';
        // Show home button
        btnHome.style.display = 'inline';
        btnEnterDashboard.style.display = 'none';
        
        // Update header
        const now = new Date();
        navLastUpdate.textContent = `Terakhir Update: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
        navLastUpdate.style.display = 'block';

        // 1. Fakta Mentah (Sidebar)
        osintFeed.innerHTML = '';
        if (data.fakta_mentah && data.fakta_mentah.length > 0) {
            headerArticleCount.textContent = `${data.fakta_mentah.length} Artikel`;
            data.fakta_mentah.forEach(item => {
                const badgeClass = item.bias_label.toLowerCase().includes('kritis') ? 'bias-badge' :
                                   item.bias_label.toLowerCase().includes('pro') ? 'bias-badge bias-purple' :
                                   'bias-badge bias-orange';
                const cardInner = `
                    <h4>${item.judul}</h4>
                    <p>${item.sumber} <span style="font-size:0.7rem; color:#94a3b8; font-weight:400;">[${item.skor}]</span></p>
                    <div class="osint-meta">${item.waktu}</div>
                    <span class="${badgeClass}">⚠ BIAS: ${item.bias_label}</span>
                `;
                osintFeed.innerHTML += item.link
                    ? `<a href="${item.link}" target="_blank" rel="noopener" class="osint-card osint-card-link">${cardInner}</a>`
                    : `<div class="osint-card">${cardInner}</div>`;
            });
        }

        // 2. Red Flags
        redFlagsContainer.innerHTML = '';
        if (data.red_flags && Array.isArray(data.red_flags)) {
            data.red_flags.forEach(flag => {
                redFlagsContainer.innerHTML += `
                    <div class="red-flag-card">
                        <div class="red-flag-card-header">
                            <h4>${flag.aktor_terkait || flag.judul}</h4>
                            <span class="badge-tinggi">${flag.tingkat_risiko || 'Tinggi'}</span>
                        </div>
                        <p>${flag.deskripsi}</p>
                    </div>
                `;
            });
        }

        // 3. Timeline
        timelineContainer.innerHTML = '';
        if (data.timeline && Array.isArray(data.timeline)) {
            data.timeline.forEach(item => {
                timelineContainer.innerHTML += `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="tl-date">${item.tanggal}</div>
                        <div class="tl-title">${item.judul}</div>
                        <div class="tl-desc">${item.ringkasan}</div>
                    </div>
                `;
            });
        }

        // 4. Transparansi Sumber — daftar artikel terverifikasi dengan link
        const sourceContainer = document.getElementById('source-links-container');
        if (sourceContainer && data.fakta_mentah?.length) {
            sourceContainer.innerHTML = `
                <p style="font-size:0.8rem; color:#64748b; margin: 8px 0 4px;">
                    <b>${data.fakta_mentah.length} artikel terverifikasi</b> — klik untuk membuka sumber asli:
                </p>
                <div style="max-height:200px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px;">
                    ${data.fakta_mentah.map((item, i) => `
                        <div style="padding:4px 0; border-bottom:1px solid #f1f5f9; font-size:0.8rem;">
                            <span style="color:#94a3b8; margin-right:6px;">[${i+1}]</span>
                            <a href="${item.link}" target="_blank" rel="noopener"
                               style="color:#2563eb; text-decoration:none;">
                                ${item.judul}
                            </a>
                            <span style="color:#94a3b8; font-size:0.75rem; margin-left:6px;">— ${item.sumber}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Transition to dashboard view
        showView(viewDashboard);
        btnGenerateSitrep.style.display = 'flex'; // reveal SITREP button
    };

    // --- Interactions ---
    
    // Launch App from Landing
    const launchApp = () => {
        btnEnterDashboard.style.display = 'none';
        navSyncStatus.style.display = 'flex';
        
        // Start "fake" terminal loading process
        // While fetch is happening in background
        fetchDashboardData();
        runTerminalSequence();
    };

    btnEnterDashboard.addEventListener('click', launchApp);
    btnLandingSearch.addEventListener('click', () => {
        if (landingSearchInput.value) {
            inputProfiler.value = landingSearchInput.value; // pass search term
            launchApp();
        } else {
            launchApp();
        }
    });

    // Back to Home
    btnHome.addEventListener('click', () => {
        showView(viewLanding);
        btnHome.style.display = 'none';
        btnEnterDashboard.style.display = 'block';
        btnGenerateSitrep.style.display = 'none';
        navLastUpdate.style.display = 'none';
    });

    // Changelog Modal
    btnChangelog.addEventListener('click', (e) => {
        e.preventDefault();
        changelogModal.style.display = 'flex';
    });
    btnCloseChangelog.addEventListener('click', () => {
        changelogModal.style.display = 'none';
    });

    // Sync button inside dashboard
    btnSyncData.addEventListener('click', () => {
        navSyncStatus.style.display = 'flex';
        syncFloaterSpinner.style.display = 'block';
        fetchDashboardData();
    });

    // Profiler Action
    btnProfilerSearch.addEventListener('click', async () => {
        const nama = inputProfiler.value.trim();
        if (!nama) return alert('Ketik nama politisi terlebih dahulu.');

        // Simple loading state
        btnProfilerSearch.innerHTML = '<div class="spinner-ring"></div>';
        btnProfilerSearch.disabled = true;

        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Gagal mengambil profil');

            // Show Modal
            profilerResultBody.textContent = data.result;
            profilerModal.style.display = 'flex';

        } catch (err) {
            alert(err.message);
        } finally {
            // Restore button
            btnProfilerSearch.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Analisis`;
            btnProfilerSearch.disabled = false;
        }
    });

    btnCloseProfiler.addEventListener('click', () => {
        profilerModal.style.display = 'none';
    });

    // ==========================================
    // PHASE 3: VIP INTELLIGENCE MODULES
    // ==========================================

    // Generic Modal Helper
    const showGenericModal = (title, htmlContent) => {
        genericModalTitle.textContent = title;
        genericModalBody.innerHTML = htmlContent;
        genericModal.style.display = 'flex';
    };

    btnCloseGeneric.addEventListener('click', () => {
        genericModal.style.display = 'none';
    });

    // 1. SITREP Generator
    btnGenerateSitrep.addEventListener('click', async () => {
        const originalText = btnGenerateSitrep.innerHTML;
        btnGenerateSitrep.innerHTML = '<div class="spinner-ring" style="border-top-color:red;"></div> Menyusun...';
        btnGenerateSitrep.disabled = true;

        try {
            const res = await fetch('/api/sitrep');
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || "Gagal membuat SITREP");
            
            let html = `
                <div style="font-family:serif; line-height:1.6;">
                    <h3 style="color:var(--red-alert); border-bottom:2px solid; padding-bottom:10px; margin-bottom:15px;">EXECUTIVE SITUATION REPORT (SITREP)</h3>
                    <p><strong>SITUASI NASIONAL:</strong><br>${data.situasi_nasional}</p>
                    <p><strong>RISIKO UTAMA:</strong><ul>${(data.risiko_utama || []).map(r => `<li>${r}</li>`).join('')}</ul></p>
                    <p><strong>MANUVER AKTOR:</strong><ul>${(data.manuver_aktor_kunci || []).map(m => `<li><b>${m.tokoh}</b>: ${m.manuver}</li>`).join('')}</ul></p>
                    <p><strong>REKOMENDASI STRATEGIS:</strong><ul>${(data.rekomendasi_strategis || []).map(r => `<li>${r}</li>`).join('')}</ul></p>
                </div>
            `;
            showGenericModal("SITREP Intelligence", html);
        } catch (err) {
            alert(err);
        } finally {
            btnGenerateSitrep.innerHTML = originalText;
            btnGenerateSitrep.disabled = false;
        }
    });

    // 2. Flip-Flop Detector
    btnFlipflopSearch.addEventListener('click', async () => {
        const nama = inputFlipflop.value.trim();
        if (!nama) return alert('Ketik nama tokoh untuk melacak Flip-Flop.');

        btnFlipflopSearch.innerHTML = '<div class="spinner-ring"></div>';
        btnFlipflopSearch.disabled = true;

        try {
            const res = await fetch('/api/flipflop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || "Gagal flipflop");

            let html = `
                <div style="text-align:center; padding: 20px 0;">
                    <div style="font-size:3rem; font-weight:800; color:${parseInt(data.skor_konsistensi) > 70 ? 'var(--brand-green)' : 'var(--red-alert)'}">${data.skor_konsistensi}%</div>
                    <div style="font-size:0.9rem; color:var(--text-muted); font-weight:bold;">SKOR KONSISTENSI</div>
                </div>
                <p><strong>Kesimpulan:</strong> ${data.kesimpulan}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:15px 0;">
                    <strong>Perbandingan Pernyataan:</strong>
                    <ul style="margin-top:10px; padding-left:20px;">
                        ${(data.perbandingan || []).map(p => `
                            <li style="margin-bottom:10px;">
                                <b>Isu: ${p.isu}</b><br>
                                <span style="color:#b45309">DULU:</span> "${p.masa_lalu}"<br>
                                <span style="color:#4c1d95">KINI:</span> "${p.saat_ini}"
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <p><strong>Grounding Konstitusi:</strong><br>${data.legal_grounding}</p>
            `;
            showGenericModal(`Radar Flip-Flop: ${nama}`, html);
        } catch (err) {
            alert(err);
        } finally {
            btnFlipflopSearch.innerHTML = 'Lacak';
            btnFlipflopSearch.disabled = false;
        }
    });

    // 3. What-If Simulator
    btnWhatifSearch.addEventListener('click', async () => {
        const skenario = inputWhatif.value.trim();
        if (!skenario) return alert('Ketik skenario manuver.');

        btnWhatifSearch.innerHTML = '<div class="spinner-ring"></div>';
        btnWhatifSearch.disabled = true;

        try {
            const res = await fetch('/api/whatif', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skenario })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || "Gagal whatif");

            let html = `
                <div style="background:#f5f3ff; border:1px solid #ddd6fe; padding:15px; border-radius:8px; margin-bottom:20px;">
                    <h4 style="margin-bottom:5px; color:#4c1d95;">Skenario Manuver:</h4>
                    <i>"${skenario}"</i>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:8px;">
                        <h4 style="color:#16a34a; margin-bottom:5px;">Reaksi Sekutu (Kawan)</h4>
                        <p style="font-size:0.9rem;">${data.reaksi_kawan}</p>
                    </div>
                    <div style="background:#fef2f2; border:1px solid #fecaca; padding:15px; border-radius:8px;">
                        <h4 style="color:#dc2626; margin-bottom:5px;">Reaksi Netral/Lawan</h4>
                        <p style="font-size:0.9rem;">${data.reaksi_lawan}</p>
                    </div>
                </div>
                <p><strong>Probabilitas Keberhasilan:</strong> ${data.probabilitas_keberhasilan}</p>
                <p><strong>Hambatan Konstitusional:</strong> ${data.hambatan_konstitusional}</p>
                <p style="color:var(--red-alert);"><strong>Risiko Fatal:</strong> ${data.risiko_fatal}</p>
            `;
            showGenericModal("Hasil Simulasi What-If", html);
        } catch (err) {
            alert(err);
        } finally {
            btnWhatifSearch.innerHTML = 'Simulasikan';
            btnWhatifSearch.disabled = false;
        }
    });

    // 3b. Kabar Dapil
    btnDapilSearch.addEventListener('click', async () => {
        const dapil = inputDapil.value.trim();
        if (!dapil) return alert('Ketik nama dapil terlebih dahulu.');

        btnDapilSearch.innerHTML = '<div class="spinner-ring"></div>';
        btnDapilSearch.disabled = true;

        try {
            const res = await fetch('/api/dapil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dapil })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Gagal mengambil data dapil');

            let html = `
                <h3 style="margin-bottom:15px; color:var(--brand-blue);">${data.nama_dapil || dapil}</h3>
                <p><strong>Ringkasan:</strong> ${data.ringkasan || '-'}</p>
                ${data.wakil_rakyat?.length ? `
                <p><strong>Wakil Rakyat:</strong></p>
                <ul>${data.wakil_rakyat.map(w => `<li><b>${w.nama}</b> — ${w.partai} (${w.jabatan})</li>`).join('')}</ul>` : ''}
                ${data.isu_terkini?.length ? `
                <p><strong>Isu Terkini:</strong></p>
                <ul>${data.isu_terkini.map(i => `<li><b>${i.judul}</b>: ${i.deskripsi}</li>`).join('')}</ul>` : ''}
            `;
            showGenericModal(`Kabar Dapil: ${dapil}`, html);
        } catch (err) {
            alert(err.message);
        } finally {
            btnDapilSearch.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Cek`;
            btnDapilSearch.disabled = false;
        }
    });

    // 4. Network Graph D3.js
    btnGenerateGraph.addEventListener('click', async () => {
        const overlay = document.getElementById('graph-overlay');
        overlay.innerHTML = '<div class="spinner-ring" style="width:30px;height:30px;border-width:4px;margin:0 auto 10px;"></div><br>Mengekstrak Konstelasi Relasi...';
        
        try {
            const res = await fetch('/api/network');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Gagal generate graph");
            
            overlay.style.display = 'none';
            renderNetworkGraph(data);
        } catch (err) {
            overlay.innerHTML = `<span style="color:red">${err.message}</span>`;
        }
    });

    function renderNetworkGraph(data) {
        if (!data.nodes || !data.links) return alert("Graf kosong.");

        // Party color map
        const partyColors = {
            'pdip': '#c0392b', 'pdi-p': '#c0392b', 'gerindra': '#e74c3c',
            'golkar': '#f39c12', 'pkb': '#27ae60', 'nasdem': '#3498db',
            'demokrat': '#2980b9', 'pks': '#8e44ad', 'pan': '#16a085',
            'ppp': '#d35400', 'hanura': '#7f8c8d'
        };
        const getPartyColor = (group) => {
            if (!group) return '#2563eb';
            const key = group.toLowerCase();
            for (const [k, v] of Object.entries(partyColors)) {
                if (key.includes(k)) return v;
            }
            return '#2563eb';
        };

        const container = document.getElementById('network-graph-container');
        const svg = d3.select("#d3-svg");
        svg.selectAll('*').remove();

        // Remove old legend if re-rendered
        const oldLegend = container.nextElementSibling;
        if (oldLegend && oldLegend.classList.contains('graph-legend')) oldLegend.remove();

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Zoom & pan
        const g = svg.append('g');
        const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
        svg.call(zoom);

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(160))
            .force("charge", d3.forceManyBody().strength(-450))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g")
            .attr("stroke-opacity", 0.7)
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("stroke-width", 2)
            .attr("stroke", d => {
                const s = (d.sentimen || '').toLowerCase();
                return s.includes('positif') ? '#10b981' : s.includes('negatif') ? '#ef4444' : '#94a3b8';
            });

        link.append("title").text(d => d.sentimen);

        const node = g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(data.nodes)
            .join("circle")
            .attr("r", 18)
            .attr("fill", d => getPartyColor(d.group))
            .call(drag(simulation));

        node.append("title").text(d => `${d.id}${d.group ? ' — ' + d.group : ''}`);

        node.on('click', (_event, d) => {
            inputProfiler.value = d.id;
            btnProfilerSearch.click();
        });

        const labels = g.append("g")
            .selectAll("text")
            .data(data.nodes)
            .join("text")
            .text(d => d.id)
            .attr("x", 22)
            .attr("y", 5)
            .style("font-family", "Inter")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", "#1e293b")
            .style("pointer-events", "none");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            node
                .attr("cx", d => Math.max(18, Math.min(width - 18, d.x)))
                .attr("cy", d => Math.max(18, Math.min(height - 18, d.y)));
            labels
                .attr("x", d => Math.max(18, Math.min(width - 18, d.x)) + 22)
                .attr("y", d => Math.max(18, Math.min(height - 18, d.y)) + 5);
        });

        // Legend
        container.insertAdjacentHTML('afterend', `
            <div class="graph-legend">
                <span class="legend-item"><span class="legend-line" style="background:#10b981"></span> Relasi Positif</span>
                <span class="legend-item"><span class="legend-line" style="background:#ef4444"></span> Relasi Negatif/Konfliktual</span>
                <span class="legend-item"><span class="legend-line" style="background:#94a3b8"></span> Relasi Netral</span>
                <span class="legend-item"><span class="legend-dot"></span> Warna node = Partai (hover untuk info)</span>
                <span class="legend-item" style="color:#94a3b8; font-size:0.75rem;">Scroll untuk zoom · Drag untuk geser · Klik node → Profiler</span>
                <button id="btn-reset-graph" class="btn-light-subtle" style="margin-left:auto; padding:4px 10px; font-size:0.75rem;">&#8635; Reset View</button>
            </div>
        `);

        document.getElementById('btn-reset-graph').addEventListener('click', () => {
            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        });

        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    }
});
