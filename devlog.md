# Devlog

## Project phase F0

### How we satisfied the software requirements

#### F0.a

The grid is stored as a two-dimensional array of grid cell records, and the player marker as a two-dimensional index into that array. The grid is drawn on a canvas using arithmetic. To allow the player marker to move within the grid, key and mouse events are read. The player marker can be controlled with the arrowkeys or by clicking on grid cells adjacent to the player marker.

#### F0.b

We store the current day as a counter and display a button whose click handler updates that counter and performs between-day logic. Between-day logic includes growing plants that can grow, distributing natural resources (water and sunlight) over the grid, and updating the display, in that order.

#### F0.c

The player can reap and sow plants only on the grid cell currently occupied by the player marker. If a grid cell is unoccupied and the player has at least one seed of the selected type in their inventory, sowing a seed transfers it from their inventory to the grid cell as a stage-1 plant. If a grid cell is occupied, reaping the plant transfers it from the grid cell to the player's inventory as a number of seeds equal to the plant's growth level.

#### F0.d

A grid cell may have at most 100 water and 100 sun. Every day, each cell has a random amount of water added to it, and its amount of sun is set randomly. Plant growth consumes water, and requires sun, but does not consume sun, since it will be overwritten anyway (since sun amount is set, not increased, with each day). For now, we are using builtin JS RNG.

#### F0.e

There are circle, triangle, and square plants. Each can have growth level 1, 2, or 3.

#### F0.f

Circle plants can only grow if there are no diagonally adjacent plants. Triangle plants can only grow if there are no cardinally adjacent plants. Square plants can only grow if there are neither diagonally nor cardinally adjacent plants. Plants at growth level 1 require 50 water and 50 sun to grow. Plants at growth level 2 require 75 water and 75 sun to grow. Plants at growth level 3 do not grow further.

#### F0.g

The game is won when the total seeds in the player's inventory meet or exceed 100 in number.

### Reflection

Here is how our thinking changed over time:

* I, Jaime, was supposed to be the tool lead, and Quinlan was supposed to be the engine lead. I grew concerned that we were far behind, and started us off. In the process, by necessity, I took over some of the engine work.
* My engine implementation was really overcomplicated and highly general. For reference, it involved expressions like `await new Promise(requestAnimationFrame)` and `new Promise((resolve) => subscribers.push(resolve))`. It would have been appropriate for developing a continuous-motion 2D game with rich animations. I think I have a bad habit of overscoping when I'm panicking. You'd think it would be the opposite, but it isn't.
* Mercifully, Quinlan started from scratch and laid the groundwork for a much more appropriately-scoped engine. He implemented a great deal of the F0 requirements, and I picked up where he left off and finished it up. I was able to constrain myself to the established implementation and coding style much more effectively with some work already in front of me to build on.