// Wuthering Waves Pull Calculator - Real Data Logic
// Uses empirical 5★ distribution data from wuwatracker.com (see `wuwatracker data.csv`)

class RealDataCalculator {
    constructor() {
        this.HARD_PITY = 80;
        this.ASTRITE_PER_PULL = 160; // adjust if you use a different cost
        this.SIMULATION_RUNS = 4000; // number of Monte Carlo runs for success-rate calculations

        // Empirical counts of when a 5★ occurred within a pity cycle
        // Index = pull number (1–80), value = number of samples at that pull
        // Source: `wuwatracker data.csv`
        const counts = new Array(this.HARD_PITY + 1).fill(0);

        // Pull 1–65 all have 2200 occurrences
        for (let i = 1; i <= 65; i++) {
            counts[i] = 2200;
        }

        // Tail region (soft pity and hard pity)
        counts[66] = 12316;
        counts[67] = 21088;
        counts[68] = 28146;
        counts[69] = 32063;
        counts[70] = 32769;
        counts[71] = 35915;
        counts[72] = 32749;
        counts[73] = 25103;
        counts[74] = 16339;
        counts[75] = 8749;
        counts[76] = 4128;
        counts[77] = 1394;
        counts[78] = 317;
        counts[79] = 35;
        counts[80] = 14;

        // Total pulls recorded in the CSV
        this.totalSamples = 394125;

        // Per-pull probability P(first 5★ at pull = k)
        this.probAtPull = new Array(this.HARD_PITY + 1).fill(0);
        // Cumulative probability P(first 5★ at pull ≤ k)
        this.cumulativeProb = new Array(this.HARD_PITY + 1).fill(0);

        let cum = 0;
        for (let k = 1; k <= this.HARD_PITY; k++) {
            const p = counts[k] / this.totalSamples;
            this.probAtPull[k] = p;
            cum += p;
            this.cumulativeProb[k] = cum;
        }

        // Expected pulls to next 5★ from a fresh cycle (pity = 0)
        this.meanFromZero = this._expectedPullsFromPity(0);
    }

    /**
     * Expected additional pulls until the next 5★,
     * given current pity (how many pulls already done since the last 5★).
     */
    _expectedPullsFromPity(currentPity) {
        if (currentPity >= this.HARD_PITY) return 0;

        const startIndex = currentPity + 1;
        const probBefore =
            currentPity > 0 ? this.cumulativeProb[currentPity] : 0;
        const remainingProb = 1 - probBefore;

        if (remainingProb <= 0) return 0;

        let expectation = 0;
        for (let k = startIndex; k <= this.HARD_PITY; k++) {
            // Conditional probability that the 5★ is at pull k,
            // given that we haven't hit it before currentPity
            const conditionalP = this.probAtPull[k] / remainingProb;
            const additionalPulls = k - currentPity;
            expectation += additionalPulls * conditionalP;
        }

        return expectation;
    }

    /**
     * Sample how many additional pulls until the next 5★,
     * given the current pity, using the empirical distribution.
     */
    _sampleAdditionalPullsFromPity(currentPity) {
        if (currentPity >= this.HARD_PITY) return 0;

        const startIndex = currentPity + 1;
        const probBefore = currentPity > 0 ? this.cumulativeProb[currentPity] : 0;
        const remainingProb = 1 - probBefore;

        if (remainingProb <= 0) return 0;

        const u = Math.random();
        const target = probBefore + u * remainingProb;

        for (let k = startIndex; k <= this.HARD_PITY; k++) {
            if (this.cumulativeProb[k] >= target) {
                return k - currentPity;
            }
        }

        // Fallback: hard pity
        return this.HARD_PITY - currentPity;
    }

    /**
     * Simulate a single run until we either obtain all desired targets
     * or exhaust maxPulls. Returns the number of pulls used on success,
     * or Infinity if we failed within maxPulls.
     * 
     * Characters use 50/50 logic (unless guarantee), weapons are always guaranteed.
     */
    _simulateSingleRun(charCount, weaponCount, startingPity, hasGuarantee, maxPulls) {
        let pullsUsed = 0;
        let pity = Math.max(0, Math.min(this.HARD_PITY - 1, Number(startingPity) || 0));
        let charGuarantee = !!hasGuarantee; // guarantee only applies to character banner
        let charSuccesses = 0;
        let weaponSuccesses = 0;

        while (pullsUsed < maxPulls && (charSuccesses < charCount || weaponSuccesses < weaponCount)) {
            if (pity >= this.HARD_PITY) {
                // Hard pity protection
                pity = 0;
            }

            const remainingPulls = maxPulls - pullsUsed;
            const additional = this._sampleAdditionalPullsFromPity(pity);

            if (additional > remainingPulls) {
                // Next 5★ would be beyond our maxPulls budget
                break;
            }

            pullsUsed += additional;
            pity = 0; // reset pity after a 5★

            // Determine which banner we're pulling on
            // If we need both, we prioritize characters first, then weapons
            const needChar = charSuccesses < charCount;
            const needWeapon = weaponSuccesses < weaponCount;

            if (needChar && needWeapon) {
                // Need both - alternate or prioritize characters
                // For simplicity, we'll pull on character banner first
                if (charGuarantee) {
                    // Guaranteed character rate-up success
                    charSuccesses += 1;
                    charGuarantee = false;
                } else {
                    // 50/50 for character rate-up
                    const isRateUp = Math.random() < 0.5;
                    if (isRateUp) {
                        charSuccesses += 1;
                        // next character 5★ is again 50/50
                    } else {
                        // Lost 50/50, next character 5★ is guaranteed rate-up
                        charGuarantee = true;
                    }
                }
            } else if (needChar) {
                // Only need characters - pull on character banner
                if (charGuarantee) {
                    charSuccesses += 1;
                    charGuarantee = false;
                } else {
                    const isRateUp = Math.random() < 0.5;
                    if (isRateUp) {
                        charSuccesses += 1;
                    } else {
                        charGuarantee = true;
                    }
                }
            } else if (needWeapon) {
                // Only need weapons - pull on weapon banner (always guaranteed, no 50/50)
                weaponSuccesses += 1;
            }
        }

        if (charSuccesses >= charCount && weaponSuccesses >= weaponCount) {
            return pullsUsed;
        }

        return Infinity;
    }

    /**
     * Run Monte Carlo simulations to obtain an empirical distribution of
     * total pulls needed to obtain all desired targets.
     */
    _simulatePullsDistribution(charCount, weaponCount, currentPity, hasGuarantee) {
        const runs = this.SIMULATION_RUNS;
        const totalTargets = charCount + weaponCount;
        // Generous upper cap for pulls - should be plenty even for many targets
        const maxPullsCap = this.HARD_PITY * (totalTargets * 4 + 5);
        const samples = new Array(runs);

        for (let i = 0; i < runs; i++) {
            samples[i] = this._simulateSingleRun(
                charCount,
                weaponCount,
                currentPity,
                hasGuarantee,
                maxPullsCap
            );
        }

        samples.sort((a, b) => a - b);
        return samples;
    }

    /**
     * Get the pull count needed to reach a given success rate target
     * based on the sorted simulation samples.
     */
    _getPullsForSuccessRate(sortedSamples, targetSuccessRate) {
        const n = sortedSamples.length;
        if (n === 0) return null;

        const clampedTarget = Math.max(0.01, Math.min(0.999, targetSuccessRate));
        const index = Math.min(
            n - 1,
            Math.max(0, Math.ceil(clampedTarget * n) - 1)
        );

        const value = sortedSamples[index];
        if (!isFinite(value)) {
            // We could not reliably reach the target success rate within the cap
            return null;
        }

        return value;
    }

    /**
     * Compute mean and some quantiles from the simulation samples.
     */
    _computeStatsFromSamples(sortedSamples) {
        const n = sortedSamples.length;
        if (n === 0) return null;

        // Ignore failed runs (Infinity) for mean calculation
        let sum = 0;
        let count = 0;
        for (let i = 0; i < n; i++) {
            const v = sortedSamples[i];
            if (!isFinite(v)) break;
            sum += v;
            count++;
        }

        if (count === 0) return null;

        const mean = sum / count;
        const quantile = (q) => {
            const idx = Math.min(
                n - 1,
                Math.max(0, Math.ceil(q * n) - 1)
            );
            const v = sortedSamples[idx];
            return isFinite(v) ? v : null;
        };

        return {
            mean,
            p50: quantile(0.5),
            p90: quantile(0.9),
            p95: quantile(0.95)
        };
    }

    /**
     * Calculate expected total pulls and astrite needed to obtain
     * a given number of 5★ characters and weapons, using:
     * - empirical pity distribution from wuwatracker data
     * - simple 50/50 model for rate-up targets
     *
     * `hasGuarantee` = true means your NEXT 5★ is guaranteed on rate-up.
     */
    calculateMultiTargetPulls(characters, weapons, currentPity, hasGuarantee, targetSuccessRateInput) {
        const charCount = Number(characters) || 0;
        const weaponCount = Number(weapons) || 0;
        const totalTargets = charCount + weaponCount;

        if (totalTargets <= 0) {
            return null;
        }

        const pity = Math.max(0, Math.min(this.HARD_PITY - 1, Number(currentPity) || 0));
        const targetSuccessRatePercent = Number(targetSuccessRateInput);
        const targetSuccess =
            isNaN(targetSuccessRatePercent)
                ? 0.9
                : Math.max(0.01, Math.min(0.999, targetSuccessRatePercent / 100));

        // Expected pulls to the next 5★ from current pity
        const expectedFirstCycle = this._expectedPullsFromPity(pity);
        // Expected pulls per full fresh cycle (starting from 0)
        const expectedFullCycle = this.meanFromZero;

        // Expected 5★ calculation:
        // - Characters: 50/50 model (1.5 expected per character if no guarantee, 1 if guarantee)
        // - Weapons: always guaranteed (1 expected per weapon, no 50/50)
        let expectedCharStars;
        if (hasGuarantee) {
            if (charCount === 1) {
                expectedCharStars = 1;
            } else {
                expectedCharStars = 1 + 1.5 * (charCount - 1);
            }
        } else {
            expectedCharStars = 1.5 * charCount;
        }
        const expectedWeaponStars = weaponCount; // weapons are always guaranteed
        const expectedFiveStars = expectedCharStars + expectedWeaponStars;

        // Run simulations to get empirical distribution of total pulls
        const samples = this._simulatePullsDistribution(charCount, weaponCount, pity, hasGuarantee);
        const stats = this._computeStatsFromSamples(samples);
        const pullsForTarget = this._getPullsForSuccessRate(samples, targetSuccess);

        const totalExpectedPulls = pullsForTarget !== null
            ? Math.round(pullsForTarget)
            : Math.round(expectedFirstCycle + Math.max(0, expectedFiveStars - 1) * expectedFullCycle);

        const astriteNeeded = totalExpectedPulls * this.ASTRITE_PER_PULL;

        return {
            totalExpected: totalExpectedPulls,
            astriteNeeded,
            expectedFiveStars,
            meanPerFiveStar: expectedFullCycle,
            targetSuccessRate: targetSuccess * 100,
            stats,
            samples // Return samples for histogram generation
        };
    }

    /**
     * Generate a real histogram from Monte Carlo simulation samples.
     * Returns an object with pull counts as keys and probability densities as values,
     * along with cumulative probabilities.
     */
    generateRealHistogram(samples, targetPulls) {
        // Filter out failed runs (Infinity)
        const successfulSamples = samples.filter(s => isFinite(s));
        const total = successfulSamples.length;
        
        if (total === 0) return { histogram: {}, cumulative: {} };

        // Determine bin width based on data range
        const minPull = Math.min(...successfulSamples);
        const maxPull = Math.max(...successfulSamples);
        const range = maxPull - minPull;
        
        // Use adaptive bin width: smaller bins for smaller ranges, larger for bigger ranges
        // Aim for roughly 50-100 bins for good visualization
        let binWidth = 1;
        if (range > 200) {
            binWidth = 5;
        } else if (range > 100) {
            binWidth = 3;
        } else if (range > 50) {
            binWidth = 2;
        }
        
        // Create histogram bins
        const histogram = {};
        const binCounts = {};
        
        // Initialize bins
        for (let pull = 0; pull <= maxPull + binWidth; pull += binWidth) {
            const bin = Math.floor(pull / binWidth) * binWidth;
            if (!binCounts[bin]) {
                binCounts[bin] = 0;
            }
        }
        
        // Count samples in each bin
        successfulSamples.forEach(pulls => {
            const bin = Math.floor(pulls / binWidth) * binWidth;
            binCounts[bin] = (binCounts[bin] || 0) + 1;
        });
        
        // Calculate probability density (probability per pull within the bin)
        // For histogram, we want probability density = (count / total) / binWidth
        let runningCumulative = 0;
        const cumulative = {};
        
        const sortedBins = Object.keys(binCounts).map(Number).sort((a, b) => a - b);
        
        sortedBins.forEach(bin => {
            const count = binCounts[bin];
            const probability = count / total; // Probability of falling in this bin
            const density = probability / binWidth; // Probability density per pull
            
            histogram[bin] = density;
            runningCumulative += probability;
            cumulative[bin] = runningCumulative;
        });
        
        return {
            histogram,
            cumulative,
            binWidth,
            totalSamples: total
        };
    }
}


