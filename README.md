# Wuthering Waves Pull Calculator

A web-based calculator that helps you determine how many pulls and astrite you need to obtain your desired 5-star characters and weapons in Wuthering Waves. Powered by real empirical data from [wuwatracker.com](https://wuwatracker.com).

## Features

- **Real Data-Based Calculations**: Uses actual pity distribution data from wuwatracker.com (394,125+ pull samples)
- **Multi-Target Support**: Calculate pulls needed for multiple characters and weapons simultaneously
- **50/50 Probability Modeling**: Accounts for character banner 50/50 mechanics and guarantee status
- **Customizable Daily Income**: 
  - Set your base daily astrite income (default: 150/day)
  - Toggle Lunite Subscription (+100 astrite/day for $5 USD/month)
- **Days Counter**: Automatically calculates how many days you need to wait to earn enough astrite
- **Probability Visualization**: Interactive chart showing probability distribution
- **Target Success Rate**: Adjustable success rate (50-99%) to see pulls needed for different confidence levels

## How to Use

1. **Set Your Goals**:
   - Use the +/- buttons to set desired 5-star characters and weapons
   
2. **Configure Your Current Status**:
   - Set your current pity count (0-79)
   - Toggle 50/50 guarantee status if you have one
   
3. **Set Your Resources**:
   - Enter your current astrite amount
   - Set your base daily income (defaults to 150 if left at 0)
   - Toggle Lunite Subscription if you're subscribed
   
4. **Adjust Target Success Rate**:
   - Use the slider to set your desired success probability (50-99%)
   
5. **Calculate**:
   - Click "Calculate Pulls" or the calculation runs automatically
   - View results showing:
     - Expected pulls needed
     - Total astrite required
     - Days needed to earn enough astrite

## Technical Details

- **Hard Pity**: 80 pulls
- **Astrite per Pull**: 160
- **Character Banner**: 50/50 rate-up system
- **Weapon Banner**: Always guaranteed (no 50/50)
- **Data Source**: Empirical distribution from wuwatracker.com CSV data
- **Calculation Method**: Monte Carlo simulation (4,000 runs) for accurate probability estimates

## Data Source

The calculator uses real pull data from [wuwatracker.com](https://wuwatracker.com), analyzing 394,125+ recorded pulls to determine the actual pity distribution probabilities.

## Browser Compatibility

Works in all modern browsers. No installation required - just open `index.html` in your browser.

## License

© 2025 Wuthering Waves Pull Calculator. Not affiliated with Kuro Games.

