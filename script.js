const videoCore = document.getElementById('iptv-video-engine');
const playlistBox = document.getElementById('playlist-box');

// গিটহাবের লাইভ প্লেলিস্টের মূল সরাসরি লিঙ্ক
const targetM3uUrl = "https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/refs/heads/main/Combined_Live_TV.m3u";
let hlsEngine = new Hls();

async function loadLiveIPTV() {
    try {
        const response = await fetch(targetM3uUrl);
        if (!response.ok) throw new Error('Fetch failed');
        
        const rawContent = await response.text();
        processM3UData(rawContent);
    } catch (err) {
        console.error("Error loading M3U:", err);
        playlistBox.innerHTML = '<div class="loading-state" style="color:#ff3366;">⚠️ প্লেলিস্ট লোড করা যায়নি! দয়া করে ইন্টারনেট কানেকশন বা গিটহাবের লিঙ্কটি চেক করুন।</div>';
    }
}

// অ্যাডভান্সড পার্সার (M3U ফাইলের যেকোনো ফরম্যাট রিড করার জন্য)
function processM3UData(rawText) {
    const finalChannels = [];
    const lines = rawText.split(/\r?\n/);
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            currentChannel = {};
            
            // নাম খুঁজে বের করা (কমা চিহ্নের পরের অংশ)
            const commaIndex = line.lastIndexOf(',');
            if (commaIndex !== -1) {
                currentChannel.name = line.substring(commaIndex + 1).trim();
            } else {
                currentChannel.name = "Live TV Channel";
            }

            // লোগো খুঁজে বের করা
            const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            currentChannel.logo = logoMatch ? logoMatch[1] : "";
            
        } else if (line.startsWith('http')) {
            if (currentChannel) {
                currentChannel.url = line;
                finalChannels.push(currentChannel);
                currentChannel = null; 
            } else {
                finalChannels.push({
                    name: "Stream Channel " + (finalChannels.length + 1),
                    logo: "",
                    url: line
                });
            }
        }
    }

    displayChannelsInSidebar(finalChannels);
}

function displayChannelsInSidebar(channels) {
    playlistBox.innerHTML = "";
    document.getElementById('channel-counter').innerText = `${channels.length} Channels`;

    if (channels.length === 0) {
        playlistBox.innerHTML = '<div class="loading-state">কোনো চ্যানেল খুঁজে পাওয়া যায়নি! M3U ফাইলটির ফরম্যাট চেক করুন।</div>';
        return;
    }

    channels.forEach((channel, index) => {
        const card = document.createElement('div');
        card.className = `channel-item ${index === 0 ? 'active' : ''}`;
        
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

    if(channels.length > 0) {
        streamCoreController(channels[0].url, playlistBox.firstChild);
    }
}

function streamCoreController(streamUrl, cardElement) {
    document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
    cardElement.classList.add('active');

    if (Hls.isSupported()) {
        hlsEngine.destroy();
        hlsEngine = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsEngine.loadSource(streamUrl);
        hlsEngine.attachMedia(videoCore);
        hlsEngine.on(Hls.Events.MANIFEST_PARSED, function() {
            videoCore.play();
        });
    } else if (videoCore.canPlayType('application/vnd.apple.mpegurl')) {
        videoCore.src = streamUrl;
        videoCore.play();
    }
}

// ইনিশিয়াল লোড
loadLiveIPTV();
