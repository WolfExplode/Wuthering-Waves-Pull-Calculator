// Wuthering Waves Pull Calculator - Main Interface
// Handles all UI interactions and connects calculator logic

class PullCalculatorUI {
    constructor() {
        this.calculator = new RealDataCalculator();
        this.state = {
            characters: 0,
            weapons: 0,
            currentPity: 0,
            hasGuarantee: false,
            bannerType: 'character',
            successRateTarget: 90,
            currentAstrite: 0,
            baseDailyIncome: 150,
            hasSubscription: false
        };
        
        this.chart = null;
        this.particleSystem = null;
        this.calculationDebounceTimer = null;
        this.chartUpdateTimer = null;
        this.isCalculating = false;
        this.currentHistogram = null;
        this.currentCumulative = null;
        this.currentBinWidth = 1;
        
        this.init();
    }

    init() {
        this.setupParticleSystem();
        this.setupEventListeners();
        this.loadSavedState();
        this.updateAllDisplays();
        this.initChart();
    }

    setupParticleSystem() {
        const sketch = (p) => {
            let particles = [];
            let lastFrameTime = 0;
            const targetFPS = 30;
            const frameInterval = 1000 / targetFPS;
            const ENABLE_CONNECTIONS = false;
            
            p.setup = () => {
                const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
                canvas.parent('particle-container');
                p.pixelDensity(1);
                
                const particleCount = Math.min(30, Math.floor((p.width * p.height) / 40000));
                
                for (let i = 0; i < particleCount; i++) {
                    particles.push({
                        x: p.random(p.width),
                        y: p.random(p.height),
                        vx: p.random(-0.2, 0.2),
                        vy: p.random(-0.2, 0.2),
                        size: p.random(1, 2),
                        opacity: p.random(0.15, 0.5)
                    });
                }
            };
            
            p.draw = () => {
                const currentTime = p.millis();
                if (currentTime - lastFrameTime < frameInterval) {
                    return;
                }
                lastFrameTime = currentTime;
                
                p.clear();
                
                particles.forEach(particle => {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    
                    if (particle.x < 0) particle.x = p.width;
                    if (particle.x > p.width) particle.x = 0;
                    if (particle.y < 0) particle.y = p.height;
                    if (particle.y > p.height) particle.y = 0;
                    
                    p.fill(6, 182, 212, particle.opacity * 255);
                    p.noStroke();
                    p.circle(particle.x, particle.y, particle.size);
                });
                
                if (ENABLE_CONNECTIONS) {
                }
            };
            
            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth, p.windowHeight);
            };
        };
        
        new p5(sketch);
    }

    setupEventListeners() {
        // Pity slider
        const pitySlider = document.getElementById('pity-slider');
        let sliderThrottleTimer = null;
        
        pitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.state.currentPity = value;
            document.getElementById('pity-value').textContent = value;
            
            if (sliderThrottleTimer) {
                clearTimeout(sliderThrottleTimer);
            }
            sliderThrottleTimer = setTimeout(() => {
                this.updatePityDisplay();
                this.saveState();
                
                if (this.state.characters > 0 || this.state.weapons > 0) {
                    this.calculateAndUpdate();
                }
            }, 150);
        });

        // Target success rate slider
        const successSlider = document.getElementById('success-slider');
        if (successSlider) {
            successSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.state.successRateTarget = value;
                const label = document.getElementById('success-value');
                if (label) {
                    label.textContent = value + '%';
                }
                this.saveState();

                if (this.state.characters > 0 || this.state.weapons > 0) {
                    this.calculateAndUpdate();
                }
            });
        }

        // Current astrite input
        const currentAstriteInput = document.getElementById('current-astrite');
        if (currentAstriteInput) {
            let astriteInputThrottleTimer = null;
            currentAstriteInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) || 0;
                this.state.currentAstrite = Math.max(0, value);
                
                if (astriteInputThrottleTimer) {
                    clearTimeout(astriteInputThrottleTimer);
                }
                astriteInputThrottleTimer = setTimeout(() => {
                    this.saveState();
                    if (this.state.characters > 0 || this.state.weapons > 0) {
                        this.updateDaysNeeded();
                    }
                }, 300);
            });
        }

        // Base daily income input
        const baseDailyIncomeInput = document.getElementById('base-daily-income');
        if (baseDailyIncomeInput) {
            let incomeInputThrottleTimer = null;
            baseDailyIncomeInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) || 0;
                this.state.baseDailyIncome = value;
                this.updateTotalDailyIncome();
                
                if (incomeInputThrottleTimer) {
                    clearTimeout(incomeInputThrottleTimer);
                }
                incomeInputThrottleTimer = setTimeout(() => {
                    this.saveState();
                    if (this.state.characters > 0 || this.state.weapons > 0) {
                        this.updateDaysNeeded();
                    }
                }, 300);
            });
        }

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(() => {
                if (this.chart) {
                    this.chart.resize();
                }
            }, 250);
        });
    }

    loadSavedState() {
        const saved = localStorage.getItem('wuwa-calculator-state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.state = { ...this.state, ...state };
                this.updateUIFromState();
            } catch (e) {
                console.warn('Failed to load saved state:', e);
            }
        }
    }

    saveState() {
        localStorage.setItem('wuwa-calculator-state', JSON.stringify(this.state));
    }

    updateUIFromState() {
        document.getElementById('character-count').textContent = this.state.characters;
        document.getElementById('weapon-count').textContent = this.state.weapons;
        document.getElementById('pity-slider').value = this.state.currentPity;
        document.getElementById('pity-value').textContent = this.state.currentPity;

        const successSlider = document.getElementById('success-slider');
        const successValue = document.getElementById('success-value');
        if (successSlider && successValue) {
            successSlider.value = this.state.successRateTarget;
            successValue.textContent = this.state.successRateTarget + '%';
        }

        const currentAstriteInput = document.getElementById('current-astrite');
        if (currentAstriteInput) {
            currentAstriteInput.value = this.state.currentAstrite;
        }

        const baseDailyIncomeInput = document.getElementById('base-daily-income');
        if (baseDailyIncomeInput) {
            baseDailyIncomeInput.value = this.state.baseDailyIncome || 150;
        }
        
        const toggle = document.getElementById('guarantee-toggle');
        if (this.state.hasGuarantee) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }

        const subscriptionToggle = document.getElementById('subscription-toggle');
        if (subscriptionToggle) {
            if (this.state.hasSubscription) {
                subscriptionToggle.classList.add('active');
            } else {
                subscriptionToggle.classList.remove('active');
            }
        }

        this.updateTotalDailyIncome();
    }

    updateTotalDailyIncome() {
        const baseIncome = this.state.baseDailyIncome || 0;
        const effectiveBase = baseIncome > 0 ? baseIncome : 150;
        const subscriptionBonus = this.state.hasSubscription ? 100 : 0;
        const totalDaily = effectiveBase + subscriptionBonus;

        const totalIncomeElement = document.getElementById('total-daily-income');
        if (totalIncomeElement) {
            totalIncomeElement.textContent = `Total: ${totalDaily} astrite/day`;
        }
    }

    getTotalDailyIncome() {
        const baseIncome = this.state.baseDailyIncome || 0;
        const effectiveBase = baseIncome > 0 ? baseIncome : 150;
        const subscriptionBonus = this.state.hasSubscription ? 100 : 0;
        return effectiveBase + subscriptionBonus;
    }

    updatePityDisplay() {
        document.getElementById('pity-value').textContent = this.state.currentPity;
        this.updateAllDisplays();
    }

    updateAllDisplays() {
        this.animateCounter('character-count', this.state.characters);
        this.animateCounter('weapon-count', this.state.weapons);
        
        document.getElementById('pity-value').textContent = this.state.currentPity;
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue === targetValue) return;
        
        anime({
            targets: { value: currentValue },
            value: targetValue,
            duration: 300,
            easing: 'easeOutQuart',
            update: function(anim) {
                element.textContent = Math.round(anim.animatables[0].target.value);
            }
        });
    }

    initChart() {
        const chartDom = document.getElementById('probability-chart');
        this.chart = echarts.init(chartDom, 'dark');
        
        const option = {
            backgroundColor: 'transparent',
            animation: false,
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: '#06b6d4',
                textStyle: {
                    color: '#f3f4f6'
                },
                formatter: (params) => {
                    const ui = window.calculatorUI;
                    const bin = params[0].axisValue;
                    const density = params[0].value;
                    
                    // Calculate the bin range
                    const binStart = Number(bin);
                    const binEnd = binStart + (ui.currentBinWidth || 1) - 1;
                    const binRange = ui.currentBinWidth > 1 
                        ? `Pulls ${binStart}-${binEnd}` 
                        : `Pull ${binStart}`;
                    
                    // Get cumulative probability for this bin
                    let cumulativeProb = 0;
                    if (ui.currentCumulative && ui.currentCumulative[bin] !== undefined) {
                        cumulativeProb = ui.currentCumulative[bin];
                    }
                    
                    // Probability of falling in this bin (density * binWidth)
                    const binProbability = density * (ui.currentBinWidth || 1);
                    
                    return `${binRange}: ${(binProbability * 100).toFixed(2)}% probability<br/>` +
                           `Cumulative: ${(cumulativeProb * 100).toFixed(2)}% chance by pull ${binEnd}`;
                }
            },
            grid: {
                left: '8%',
                right: '4%',
                bottom: '8%',
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: [],
                axisLine: {
                    lineStyle: {
                        color: '#374151'
                    }
                },
                axisLabel: {
                    color: '#9ca3af'
                }
            },
            yAxis: {
                type: 'value',
                name: 'Probability per Pull',
                nameLocation: 'middle',
                nameGap: 50,
                nameTextStyle: {
                    color: '#9ca3af',
                    fontSize: 12
                },
                axisLine: {
                    lineStyle: {
                        color: '#374151'
                    }
                },
                axisLabel: {
                    color: '#9ca3af',
                    formatter: function(value) {
                        return (value * 100).toFixed(1) + '%';
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#374151'
                    }
                }
            },
            series: [{
                name: 'Probability Density',
                type: 'bar',
                barWidth: 'auto',
                itemStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: '#06b6d4' },
                            { offset: 1, color: '#7c3aed' }
                        ]
                    }
                },
                emphasis: {
                    itemStyle: {
                        color: '#06b6d4'
                    }
                },
                data: []
            }]
        };
        
        this.chart.setOption(option);
    }

    updateChart(histogramData, targetPulls = null) {
        if (this.chartUpdateTimer) {
            clearTimeout(this.chartUpdateTimer);
        }

        this.chartUpdateTimer = setTimeout(() => {
            if (!this.chart || !histogramData || !histogramData.histogram || Object.keys(histogramData.histogram).length === 0) {
                this.currentHistogram = null;
                this.currentCumulative = null;
                this.currentBinWidth = 1;
                this.chart.setOption({
                    xAxis: { data: [] },
                    series: [{ data: [] }]
                });
                return;
            }

            // Store histogram data for tooltip
            this.currentHistogram = histogramData.histogram;
            this.currentCumulative = histogramData.cumulative;
            this.currentBinWidth = histogramData.binWidth || 1;

            const bins = Object.keys(histogramData.histogram).map(Number).sort((a, b) => a - b);
            const densities = bins.map(bin => histogramData.histogram[bin]);
            
            // Prepare markLine for target pulls if available
            // For a category axis, markLine.xAxis should use the *index* of the category,
            // not the pull number itself. Otherwise, once we start binning (binWidth > 1)
            // and pulls get large, the line can fall outside the visible x-axis and disappear.
            let markLine = undefined;
            if (targetPulls !== null && targetPulls > 0 && bins.length > 0) {
                // Find the closest bin to the target pulls
                let closestBin = bins[0];
                let minDiff = Math.abs(bins[0] - targetPulls);
                for (let i = 1; i < bins.length; i++) {
                    const diff = Math.abs(bins[i] - targetPulls);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestBin = bins[i];
                    }
                }

                // Convert the closestBin value into its category index on the x-axis.
                // Using the pull number directly (e.g., 200) as xAxis on a category axis
                // makes ECharts treat it as "200th category index", which is usually out
                // of range when we only have ~50–100 binned categories, causing the
                // markLine to vanish when many pulls are displayed.
                const closestIndex = bins.indexOf(closestBin);

                if (closestIndex !== -1) {
                markLine = {
                    silent: true,
                    symbol: 'none',
                    data: [{
                        xAxis: closestIndex,
                        lineStyle: {
                            color: '#34D399',
                            width: 2,
                            type: 'dashed'
                        },
                        label: { show: false },
                    }]
                };
                }
            }
            
            const option = {
                xAxis: {
                    data: bins,
                    name: 'Pulls',
                    nameLocation: 'middle',
                    nameGap: 30,
                    nameTextStyle: {
                        color: '#9ca3af',
                        fontSize: 12
                    }
                },
                yAxis: {
                    name: 'Probability per Pull',
                    nameLocation: 'middle',
                    nameGap: 50,
                    nameTextStyle: {
                        color: '#9ca3af',
                        fontSize: 12
                    },
                    axisLabel: {
                        formatter: function(value) {
                            return (value * 100).toFixed(1) + '%';
                        }
                    }
                },
                grid: {
                    left: '4%',
                    right: '4%',
                    bottom: '8%',
                    top: '5%',
                    containLabel: true
                },
                series: [{
                    data: densities,
                    markLine: markLine
                }]
            };
            
            this.chart.setOption(option, { notMerge: false, lazyUpdate: true });
        }, 150);
    }

    calculateAndUpdate() {
        if (this.calculationDebounceTimer) {
            clearTimeout(this.calculationDebounceTimer);
        }

        this.calculationDebounceTimer = setTimeout(() => {
            this._performCalculation();
        }, 300);
    }

    _performCalculation() {
        if (this.isCalculating) return;
        
        if (this.state.characters === 0 && this.state.weapons === 0) {
            this.clearResults();
            return;
        }

        this.isCalculating = true;
        this.showLoading();

        requestAnimationFrame(() => {
            try {
                const results = this.calculator.calculateMultiTargetPulls(
                    this.state.characters,
                    this.state.weapons,
                    this.state.currentPity,
                    this.state.hasGuarantee,
                    this.state.successRateTarget
                );

                let histogramData = null;
                if (results && results.totalExpected && results.samples) {
                    histogramData = this.calculator.generateRealHistogram(
                        results.samples,
                        results.totalExpected
                    );
                }

                this.updateResults(results, histogramData);
            } catch (error) {
                console.error('Calculation error:', error);
                this.clearResults();
            } finally {
                this.hideLoading();
                this.isCalculating = false;
            }
        });
    }

    showLoading() {
        const button = document.getElementById('calculate-btn');
        button.textContent = 'Calculating...';
        button.disabled = true;
    }

    hideLoading() {
        const button = document.getElementById('calculate-btn');
        button.textContent = 'Calculate Pulls';
        button.disabled = false;
    }

    updateResults(results, histogramData) {
        if (!results || !results.totalExpected) {
            this.clearResults();
            return;
        }

        const totalExpected = results.totalExpected;
        const astriteNeeded = results.astriteNeeded;

        this.animateValue('expected-pulls', totalExpected, 0);
        this.animateValue('astrite-cost', astriteNeeded, 0);
        this.updateDaysNeeded(astriteNeeded);

        // If stats from simulations are available, update percentile displays
        if (results.stats) {
            const { p50, p90, p95 } = results.stats;
            if (p50 != null) {
                const el = document.getElementById('median-pulls');
                if (el) el.textContent = Math.round(p50);
            }
            if (p90 != null) {
                const el = document.getElementById('percentile-90');
                if (el) el.textContent = Math.round(p90);
            }
            if (p95 != null) {
                const el = document.getElementById('percentile-95');
                if (el) el.textContent = Math.round(p95);
            }
        } else {
            const median = document.getElementById('median-pulls');
            const p90 = document.getElementById('percentile-90');
            const p95 = document.getElementById('percentile-95');
            if (median) median.textContent = Math.round(totalExpected * 0.9);
            if (p90) p90.textContent = Math.round(totalExpected * 1.2);
            if (p95) p95.textContent = Math.round(totalExpected * 1.3);
        }

        const totalPullsEl = document.getElementById('total-pulls');
        const totalAstriteEl = document.getElementById('total-astrite');
        if (totalPullsEl) totalPullsEl.textContent = totalExpected;
        if (totalAstriteEl) totalAstriteEl.textContent = astriteNeeded.toLocaleString();

        if (histogramData) {
            this.updateChart(histogramData, totalExpected);
        }

        if (!this._hasAnimatedResults) {
            anime({
                targets: '.glass-panel',
                scale: [0.98, 1],
                opacity: [0.8, 1],
                duration: 400,
                easing: 'easeOutQuart',
                delay: anime.stagger(50)
            });
            this._hasAnimatedResults = true;
        }
    }

    updateDaysNeeded(astriteNeeded = null) {
        const daysElement = document.getElementById('days-needed');
        
        if (!daysElement) return;

        // Get total daily income (base + subscription, defaulting to 150 if base is 0)
        const dailyAstrite = this.getTotalDailyIncome();

        // If astriteNeeded is not provided, try to get it from the displayed value
        if (astriteNeeded === null) {
            const astriteCostElement = document.getElementById('astrite-cost');
            if (astriteCostElement && astriteCostElement.textContent !== '-') {
                astriteNeeded = parseFloat(astriteCostElement.textContent.replace(/[^\d.]/g, ''));
            } else {
                daysElement.textContent = '-';
                return;
            }
        }

        const currentAstrite = this.state.currentAstrite || 0;
        const astriteDeficit = Math.max(0, astriteNeeded - currentAstrite);
        const daysNeeded = dailyAstrite > 0 ? Math.ceil(astriteDeficit / dailyAstrite) : Infinity;

        if (astriteDeficit <= 0) {
            this.animateValue('days-needed', 0, 0);
        } else if (daysNeeded === Infinity) {
            daysElement.textContent = '-';
        } else {
            this.animateValue('days-needed', daysNeeded, 0);
        }
    }

    animateValue(elementId, targetValue, startValue = 0, suffix = '') {
        const element = document.getElementById(elementId);
        const currentText = element.textContent;
        
        if (currentText !== '-' && currentText !== '') {
            const currentValue = parseFloat(currentText.replace(/[^\d.]/g, ''));
            if (Math.abs(currentValue - targetValue) < 0.1) {
                return;
            }
        }
        
        anime({
            targets: { value: startValue },
            value: targetValue,
            duration: 600,
            easing: 'easeOutQuart',
            update: function(anim) {
                const value = anim.animatables[0].target.value;
                if (suffix === '%') {
                    element.textContent = Math.round(value) + suffix;
                } else if (targetValue > 1000) {
                    element.textContent = Math.round(value).toLocaleString() + suffix;
                } else {
                    element.textContent = Math.round(value * 10) / 10 + suffix;
                }
            }
        });
    }

    clearResults() {
        const placeholders = ['-', '-', '-'];
        const expected = document.getElementById('expected-pulls');
        const astrite = document.getElementById('astrite-cost');
        const days = document.getElementById('days-needed');
        if (expected) expected.textContent = placeholders[0];
        if (astrite) astrite.textContent = placeholders[1];
        if (days) days.textContent = placeholders[2];

        ['median-pulls', 'mode-pulls', 'percentile-90', 'percentile-95', 'total-pulls', 'total-astrite'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });

        this.updateChart({});
        this._hasAnimatedResults = false;
    }
}

function adjustCounter(type, delta) {
    const ui = window.calculatorUI;
    const currentValue = ui.state[type];
    const newValue = Math.max(0, Math.min(10, currentValue + delta));
    
    if (newValue !== currentValue) {
        ui.state[type] = newValue;
        ui.updateAllDisplays();
        ui.saveState();
        
        if (ui.state.characters > 0 || ui.state.weapons > 0) {
            ui.calculateAndUpdate();
        }
    }
}

function updatePityDisplay(value) {
    const ui = window.calculatorUI;
    ui.state.currentPity = parseInt(value);
    ui.updatePityDisplay();
    ui.saveState();
    
    if (ui.state.characters > 0 || ui.state.weapons > 0) {
        ui.calculateAndUpdate();
    }
}

function toggleGuarantee() {
    const ui = window.calculatorUI;
    ui.state.hasGuarantee = !ui.state.hasGuarantee;
    
    const toggle = document.getElementById('guarantee-toggle');
    if (ui.state.hasGuarantee) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
    
    ui.saveState();
    
    if (ui.state.characters > 0 || ui.state.weapons > 0) {
        ui.calculateAndUpdate();
    }
}

function calculatePulls() {
    window.calculatorUI.calculateAndUpdate();
}

function updateCurrentAstrite(value) {
    const ui = window.calculatorUI;
    const numValue = parseInt(value) || 0;
    ui.state.currentAstrite = Math.max(0, numValue);
    ui.saveState();
    
    // Update days needed if we have results
    const astriteCostEl = document.getElementById('astrite-cost');
    if (astriteCostEl && astriteCostEl.textContent !== '-') {
        ui.updateDaysNeeded();
    }
}

function updateBaseDailyIncome(value) {
    const ui = window.calculatorUI;
    const numValue = parseInt(value) || 0;
    ui.state.baseDailyIncome = numValue;
    ui.updateTotalDailyIncome();
    ui.saveState();
    
    // Update days needed if we have results
    const astriteCostEl = document.getElementById('astrite-cost');
    if (astriteCostEl && astriteCostEl.textContent !== '-') {
        ui.updateDaysNeeded();
    }
}

function toggleSubscription() {
    const ui = window.calculatorUI;
    ui.state.hasSubscription = !ui.state.hasSubscription;
    
    const toggle = document.getElementById('subscription-toggle');
    if (ui.state.hasSubscription) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
    
    ui.updateTotalDailyIncome();
    ui.saveState();
    
    // Update days needed if we have results
    const astriteCostEl = document.getElementById('astrite-cost');
    if (astriteCostEl && astriteCostEl.textContent !== '-') {
        ui.updateDaysNeeded();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.calculatorUI = new PullCalculatorUI();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (anime.running) {
            anime.running.forEach(anim => anim.pause());
        }
        if (window.p5 && window.p5.instance) {
            window.p5.instance.noLoop();
        }
    } else {
        if (anime.running) {
            anime.running.forEach(anim => anim.play());
        }
        if (window.p5 && window.p5.instance) {
            window.p5.instance.loop();
        }
    }
});
