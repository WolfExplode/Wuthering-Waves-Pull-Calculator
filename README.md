# Wuthering Waves Pull Calculator

A web-based calculator that helps you determine how many pulls and astrite you need to obtain your desired 5-star characters and weapons in Wuthering Waves.

## How To Run
Download the repository and open `index.html` in your browser to run the calculator

![WutheringWavesPullCalculator](https://github.com/user-attachments/assets/3219be80-6787-480a-a199-dbd6710e258a)

## Technical Details
- **Hard Pity**: 80 pulls
- **Required Astrite per Pull**: 160
- **Character Banner**: 50/50 rate-up system
- **Weapon Banner**: Always guaranteed (no 50/50)
- **Calculation Method**: Monte Carlo simulation (4,000 runs) for accurate probability estimates

## Data Source
The calculator uses real user submitted data from [wuwatracker.com](https://wuwatracker.com/tracker/stats/100020), Cartethyia's banner with 394,125+ recorded pulls to determine the actual pity distribution probabilities.

### Probability Distribution Graph:
![Probability Distribution](https://github.com/user-attachments/assets/b42a83ab-1115-4738-8a2c-c96e2219476b)
This graph shows the result from 4,000 simulated pulls
Each bar represents the percentage of players who needed **exactly** that many pulls. The height shows how common that outcome is. The taller the bar, the more likely.

- **Probability**: Your chance of finishing within this exact range
- **Cumulative**: Your total chance of finishing by the end of this range
- **Dashed Line**: your Pulls for Target Success Rate.

