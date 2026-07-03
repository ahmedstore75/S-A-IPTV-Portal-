const videoCore = document.getElementById('iptv-video-engine');
const playlistBox = document.getElementById('playlist-box');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const totalChannelCounter = document.getElementById('total-channel-counter');

const targetM3uUrl = "https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/refs/heads/main/Combined_Live_TV.m3u";
let hlsEngine = new Hls();
let globalChannelsList = []; 

// শতভাগ পারফেক্ট ফুল স্ক্রিন হ্যান্ডলার (ল্যাপটপ ও মোবাইলের জন্য)
videoCore.addEventListener('dblclick', function() {
    togglePortalFullscreen();
});

// মোবাইলে ডাবল ট্যাপ করার জন্য টাচ ইভেন্ট
let lastTapTime = 0;
videoCore.addEventListener('touchend', function(e) {
    let currentTime = new Date().getTime();
    let tapDelay = currentTime - lastTapTime;
    if (tapDelay < 300 && tapDelay > 0) {
        togglePortalFullscreen();
        e.preventDefault();
    }
    lastTapTime = currentTime;
});

function togglePortalFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !videoCore.webkitDisplayingFullscreen) {
        // ফুল স্ক্রিন চালু করার রিকোয়েস্ট
        if (videoCore.requestFullscreen) {
            videoCore.requestFullscreen();
        } else if (videoCore.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            videoCore.webkitRequestFullscreen();
        } else if (videoCore.webkitEnterFullscreen) { /* iOS Safari স্পেশাল ফিক্স */
            videoCore.webkitEnterFullscreen();
        }
    } else {
        // ফুল স্ক্রিন বন্ধ করার রিকোয়েস্ট
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

async function loadLiveIPTV() {
    try {
        let response = await fetch(targetM3uUrl);
        if(!response.ok) {
            response = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(targetM3uUrl));
        }
        if (!response.ok) throw new Error('Fetch failed');
        
        const rawContent = await response.text();
        processM3UData(rawContent);
    } catch (err) {
        console.error("Error loading M3U:", err);
        playlistBox.innerHTML = '<div class="loading-state" style="color:#ff3366;">⚠️ Failed to load playlist! Please check your connection.</div>';
        totalChannelCounter.innerText = "Channels: 0";
    }
}

function processM3UData(rawText) {
    const lines = rawText.split(/\r?\n/);
    let currentChannel = null;
    let categories = new Set(); 

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            currentChannel = {};
            
            const commaIndex = line.lastIndexOf(',');
            currentChannel.name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : "Live TV Channel";

            const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentChannel.logo = logoMatch ? logoMatch[1] : "";

            const groupMatch = line.match(/group-title="([^"]+)"/i);
            currentChannel.category = groupMatch ? groupMatch[1].trim() : "Others";
            categories.add(currentChannel.category);
            
        } else if (line.startsWith('http')) {
            if (currentChannel) {
                currentChannel.url = line;
                globalChannelsList.push(currentChannel);
                currentChannel = null; 
            } else {
                globalChannelsList.push({
                    name: "Stream Channel " + (globalChannelsList.length + 1),
                    logo: "",
                    category: "Others",
                    url: line
                });
            }
        }
    }

    // Update Total Channels Badge
    totalChannelCounter.innerText = "Total Channels: " + globalChannelsList.length;

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        categorySelect.appendChild(option);
    });

    renderSidebarList(globalChannelsList);
    
    if(globalChannelsList.length > 0) {
        streamCoreController(globalChannelsList[0].url, playlistBox.firstChild);
    }
}

function handleFilter() {
    let searchText = searchInput.value.toLowerCase().trim();
    if (searchText !== "") { categorySelect.value = 'all'; }
    let selectedCategory = categorySelect.value;

    const filtered = globalChannelsList.filter(channel => {
        const matchesSearch = channel.name.toLowerCase().includes(searchText);
        const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    renderSidebarList(filtered);
}

function renderSidebarList(channels) {
    playlistBox.innerHTML = "";
    if (channels.length === 0) {
        playlistBox.innerHTML = '<div class="loading-state">No matching channels found!</div>';
        return;
    }

    channels.forEach((channel) => {
        const card = document.createElement('div');
        card.className = 'channel-item';
        if (videoCore.dataset.currentUrl === channel.url) { card.classList.add('active'); }
        
        const logoPreview = channel.logo 
            ? `<img src="${channel.logo}" onerror="this.src=''; this.parentElement.innerText='SA'">` 
            : `SA`;

        card.innerHTML = `
            <div class="channel-logo">${logoPreview}</div>
            <div class="channel-info">
                <h3>${channel.name}</h3>
            </div>
        `;
        card.onclick = () => streamCoreController(channel.url, card);
        playlistBox.appendChild(card);
    });
}

function streamCoreController(streamUrl, cardElement) {
    videoCore.dataset.currentUrl = streamUrl; 
    document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
    if(cardElement) cardElement.classList.add('active');

    if (Hls.isSupported()) {
        hlsEngine.destroy();
        hlsEngine = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsEngine.loadSource(streamUrl);
        hlsEngine.attachMedia(videoCore);
        hlsEngine.on(Hls.Events.MANIFEST_PARSED, function() { videoCore.play(); });
    } else if (videoCore.canPlayType('application/vnd.apple.mpegurl')) {
        videoCore.src = streamUrl;
        videoCore.play();
    }
}

searchInput.addEventListener('input', handleFilter);
categorySelect.addEventListener('change', handleFilter);
loadLiveIPTV();
