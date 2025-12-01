# Bayesian Fermi Estimation

![Fermi Logo](assets/fermi_logo.png)

## Introduction

This tool helps you make probabilistic estimates using the [Fermi method](https://en.wikipedia.org/wiki/Fermi_problem). It allows you to break down complex problems into smaller, manageable variables and calculate the probability distribution of the outcome using Monte Carlo simulations.

Whether you're estimating market size, the potential impacts of policy changes, or the number of piano tuners in Chicago, this tool provides a rigorous yet accessible way to handle uncertainty.

## Features

-   **Flexible Distributions**: Support for Normal, Uniform, LogNormal (90% CI), PERT, and Constant values.
-   **Custom Formulas**: Define variables that mathematically reference other variables (e.g., `Population * Rate`).
-   **Monte Carlo Simulation**: Runs 10,000 simulations to generate a probability distribution of the result.
-   **Data Visualization**: Interactive histogram and key statistics (Mean, Median, 90% Confidence Interval).
-   **Save & Load**: Persist your models to JSON files or export results to CSV.

## How to Use

1.  **Add Variables**: Click **+ Add Variable** to create a new component of your estimation.
2.  **Configure Variables**:
    -   **Name**: Give each variable a unique name (e.g., `Population`, `ConversionRate`).
    -   **Type**: Select the probability distribution that best fits your knowledge (e.g., *LogNormal* for ranges where you know the lower and upper bounds).
    -   **Parameters**: Enter the values for the chosen distribution.
3.  **Define Logic**: Use the **Formula** type to combine variables. You can write mathematical expressions using variable names (e.g., `Var1 * Var2`).
4.  **Run Simulation**: Click **Run Simulation** to perform the Monte Carlo analysis.
5.  **Analyze Results**: Review the histogram and statistics to understand the range of probable outcomes.
6.  **Export**: Download your results as a CSV or save the entire model for later use.

## Example

Click the **Load Example** button to see a classic Fermi problem: *How many piano tuners are there in Chicago?*

You can also load your own example by clicking the **Load Example** button and selecting a JSON file. [examples/england-dwelling-fires.json](https://github.com/matthewgthomas/fermi/blob/main/examples/england-dwelling-fires.json) shows how to estimate the number of dwelling fires in England per year.
