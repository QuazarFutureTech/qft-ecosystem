var join_modal = document.getElementById("modalJoin");
var frame_modal = document.getElementById("modalFrame");
var btn = document.getElementById("myBtn");
var span = document.getElementsByClassName("beta_close")[0];
var join_modal_close = document.getElementsByClassName("join_close")[0];
var frame_modal_close = document.getElementsByClassName("frame_close")[0];


// QFT Beta Modal with Dev Detection - UNIFIED VERSION
var beta_modal = document.getElementById("modalBeta");

if (beta_modal) {
    var span = document.querySelector('.beta_close');
    
    // Detect if dev build
    function isDevBuild() {
        const hostname = window.location.hostname;
        const isDev = hostname.includes('dev.quazarfuturetech.com') || 
                     hostname.includes('localhost') || 
                     hostname.includes('127.0.0.1') ||
                     hostname.includes('staging') ||
                     hostname === '';
            // Production domains (don't show modal/badge)
    const isProduction = hostname === 'quazarfuturetech.com' || 
                        hostname === 'www.quazarfuturetech.com';
    
    console.log('🔍 Hostname:', hostname);
    console.log('🔍 Is Dev:', isDev && !isProduction);
    
    return isDev && !isProduction;
    }
    
    // Add dev badge function
    function addDevBadge() {
        console.log('🔧 addDevBadge() called');
        
        // Check if already exists
        if (document.getElementById('qftDevBadge')) {
            console.log('ℹ️ Badge already exists, skipping');
            return;
        }
        
        // Check if body exists
        if (!document.body) {
            console.log('⏳ Body not ready, retrying in 100ms');
            setTimeout(addDevBadge, 100);
            return;
        }
        
        console.log('✅ Creating badge...');
        
        const badge = document.createElement('div');
        badge.id = 'qftDevBadge';
        badge.innerHTML = '🔧 DEV BUILD';
        badge.title = 'Development Build - Click to reopen info modal';
        
        // Apply styles directly
        badge.style.position = 'fixed';
        badge.style.bottom = '32px';
        badge.style.left = '32px';
        badge.style.opacity = '0.5';
        badge.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        badge.style.color = 'white';
        badge.style.padding = '10px 18px';
        badge.style.borderRadius = '20px';
        badge.style.fontSize = '13px';
        badge.style.fontWeight = 'bold';
        badge.style.zIndex = '999999';
        badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        badge.style.fontFamily = 'Arial, sans-serif';
        badge.style.cursor = 'pointer';
        badge.style.transition = 'transform 0.2s';
        badge.style.display = 'block';
        
        // Hover effects
        badge.onmouseover = function() {
            this.style.transform = 'scale(1.1)';
            this.style.opacity = '0.8';
            this.style.transition = 'ease-in-out 0.5s';
        };
        
        badge.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.opacity = '0.25';
            this.style.transition = 'ease-in-out 0.5s';
        };
        
        // Click to reopen modal
        badge.onclick = function() {
            console.log('🖱️ Badge clicked - reopening modal');
            sessionStorage.removeItem('qftBetaModalDismissed');
            beta_modal.style.display = 'flex';
            beta_modal.style.animation = 'fade';
            beta_modal.style.animationDuration = '1s';
        };
        
        // Append to body
        document.body.appendChild(badge);
        console.log('✅ Badge appended to body');
        console.log('✅ Badge in DOM:', document.getElementById('qftDevBadge'));
    }
    
    // Update modal content for dev build
    function updateModalForDev() {
        const betaTitle = document.getElementById('betaTitle');
        const betaMessage = document.getElementById('betaMessage');
        
        if (betaTitle) {
            betaTitle.innerHTML = '<i class="fa fa-code" aria-hidden="true"></i> Development Build';
        }
        
        if (betaMessage) {
            betaMessage.innerHTML = `
                Welcome! <br><br>
                You are viewing the <strong style="color: #667eea;">DEVELOPMENT BUILD</strong> of quazarfuturetech.com<br>
                This version may contain incomplete features, bugs, or experimental content.<br><br>
                <strong>Report Issues: </strong><br>
                <a href="https://github.com/QuazarFutureTech/qft-ecosystem/issues" style="color: #0084FF;">
                    GitHub Repository →
                </a><br><br>
                <strong>Visit Production Site:</strong><br>
                <a href="https://quazarfuturetech.github.io" style="color: #43b581; font-weight: bold;">
                    quazarfuturetech. github.io →
                </a>
            `;
        }
    }
    
    // Main initialization
    window.addEventListener('load', function() {
        console.log('📋 Beta Modal - Page Loaded');
        
        const isDev = isDevBuild();
        
        if (isDev) {
            console.log('✅ Dev build detected');
            
            // Show modal if not dismissed
            if (!sessionStorage.getItem('qftBetaModalDismissed')) {
                console.log('✅ Opening beta modal');
                beta_modal.style.display = 'flex';
                beta_modal.style.animation = 'fade';
                beta_modal.style.animationDuration = '1s';
                updateModalForDev();
            } else {
                console.log('ℹ️ Modal was dismissed this session');
            }
            
            // Always add badge on dev builds
            console.log('🔧 Calling addDevBadge()');
            addDevBadge();
        } else {
            console.log('ℹ️ Production build - no modal or badge');
        }
    });
    
    // Close button handler
    if (span) {
        span.onclick = function() {
            console.log('❌ Modal closed via X button');
            beta_modal.style.display = 'none';
            sessionStorage.setItem('qftBetaModalDismissed', 'true');
        };
    }
    
    // Click outside to close
    window.onclick = function(event) {
        if (event.target == beta_modal) {
            console.log('❌ Modal closed via outside click');
            beta_modal.style.display = 'none';
            sessionStorage.setItem('qftBetaModalDismissed', 'true');
        }
    };
    
    // Manual close function (global)
    window.closeBetaModal = function() {
        console.log('❌ Modal closed via closeBetaModal()');
        if (span) span.click();
    };
}

if (frame_modal) {
    				function openFrame(pageName, elmnt) {
				    var i, framecontent, framelinks;
				    framecontent = document.getElementsByClassName("frame-content");
				    for (i = 0; i < framecontent.length; i++) {
				        framecontent[i].style.display = "none";
				    }
				    framelinks = document.getElementsByClassName("frame-link");
				    for (i = 0; i < framelinks.length; i++) {

				    }
                    document.body.style.overflowY = "hidden";
                    frame_modal.style.display = "flex";
                            frame_modal.style.animation = "fade";
        frame_modal.style.animationDuration = "1s";
				    document.getElementById(pageName).style.display = "flex";
				}
 frame_modal_close.onclick = function() {
        frame_modal.style.animation = "fade_out";
        frame_modal.style.animationDuration = "1s";
        frame_modal.style.display = "none";
        document.body.style.overflowY = "initial";
    };

    window.onclick = function(event) {
        if (event.target == join_modal) {
            frame_modal.style.display = "none";
        }
    };
}

if (join_modal) {
    function openJoin(){
        join_modal.style.display = "flex";
        join_modal.style.animation = "fade";
        join_modal.style.animationDuration = "1s";
    }
    btn.onclick = function() {
        join_modal.style.display = "flex";
        join_modal.style.animation = "fade";
        join_modal.style.animationDuration = "1s";
    };
    // When the user clicks the button, open the modal 

    join_modal_close.onclick = function() {
        join_modal.style.animation = "fade_out";
        join_modal.style.animationDuration = "1s";
        join_modal.style.display = "none";
    };
    window.onclick = function(event) {
        if (event.target == join_modal) {
            join_modal.style.display = "none";
        }
    };

}