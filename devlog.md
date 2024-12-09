# Devlog

## Project phase F1

### How we satisfied the software requirements

- **F0.a:** Same as last week.
- **F0.b:** Same as last week.
- **F0.c:** Same as last week.
- **F0.d:** Same as last week.
- **F0.e:** Same as last week.
- **F0.f:** Same as last week.
- **F0.g:** Same as last week.
- **F1.a:** Data format is array of structures. Great care was taken to ensure
  the data representation is contiguous in memory, per requirements: we use a
  Uint8Array, and getters and setters that work with offsets and bitmasks.
  ![F1.a data structure diagram](./f1_a_diagram.png)
- **F1.b:** Manual save/load functionality was added, provided via a slot
  selector input and save/load/erase buttons in a collapsible marked "Save
  management."
- **F1.c:** The game autosaves to and autoloads from slot -1, which is not
  manually accessible, but can effectively be erased with a provided "new game"
  button.
- **F1.d:** An undo and redo system was added, implemented by switching from
  directly storing the memory hex string in localStorage to storing undo and
  redo stacks there. The undo and redo stacks are then arrays of memory hex
  strings. To undo is to move the top of the undo stack to the top of the redo
  stack, and to redo is to move the top of the redo stack to the top of the undo
  stack. The top of the undo stack is at all times regarded as the current game
  state, and successfully moving, reaping, sowing, or advancing time creates a
  new undo step.

### Reflection

> It would be very suspicious if you didn’t need to change anything.

I find this phrasing confusing and a frankly little bit insulting. What exactly
would be suspicious about it? If the requirements are fulfilled, then they're
fulfilled, aren't they? It's not as if we can't read ahead and plan our
project's structure from the very beginning according to changes that will have
to be made in the far future, if we really want to. I don't see how that would
in any way be intellectually dishonest.

That being said, we did not do that, so of course there were changes of plans:

- Data representation changed from direct JS objects to proxy objects for an
  underlying byte array. This was a fairly high-effort change, but was
  encapsulated with getters and setters so that mostly only a self-contained
  portion of the code needed to change.
- Data representation then changed from byte array to array of byte arrays. This
  was a medium-high-effort change.
- For the majority of the assignment, we did _not_ "think about giving the
  player more feedback," because the requirements page _for the project_ did not
  tell us to do that. I would have appreciated if the project requirements were
  on the project requirements page and not on the devlog requirements page. When
  I go to the devlog requirements page, I expect the fact that I've fulfilled
  all requirements listed on the project requirements page means I'm done
  working on this portion of the project and am now ready to work on the devlog.
  I don't want to do a mental context switch into writing the devlog and then
  have to switch back because the _devlog_ requirements include extra _project_
  requirements. Anyway: Low-effort changes were made last-minute to give the
  player more feedback. I could have done more to this end, but I did not,
  because I felt what I did do was adequate for game legibility purposes despite
  not requiring much effort. The changes ensure that if you can read, then you
  can play the game.

## Project phase F0

### How we satisfied the software requirements

- **F0.a:** The grid is stored as a two-dimensional array of grid cell records,
  and the player marker as a two-dimensional index into that array. The grid is
  drawn on a canvas using arithmetic. To allow the player marker to move within
  the grid, key and mouse events are read. The player marker can be controlled
  with the arrowkeys or by clicking on grid cells adjacent to the player marker.
- **F0.b:** We store the current day as a counter and display a button whose
  click handler updates that counter and performs between-day logic. Between-day
  logic includes growing plants that can grow, distributing natural resources
  (water and sunlight) over the grid, and updating the display, in that order.
- **F0.c:** The player can reap and sow plants only on the grid cell currently
  occupied by the player marker. If a grid cell is unoccupied and the player has
  at least one seed of the selected type in their inventory, sowing a seed
  transfers it from their inventory to the grid cell as a stage-1 plant. If a
  grid cell is occupied, reaping the plant transfers it from the grid cell to
  the player's inventory as a number of seeds equal to the plant's growth level.
- **F0.d:** A grid cell may have at most 100 water and 100 sun. Every day, each
  cell has a random amount of water added to it, and its amount of sun is set
  randomly. Plant growth consumes water, and requires sun, but does not consume
  sun, since it will be overwritten anyway (since sun amount is set, not
  increased, with each day). For now, we are using builtin JS RNG.
- **F0.e:** There are circle, triangle, and square plants. Each can have growth
  level 1, 2, or 3.
- **F0.f:** Circle plants can only grow if there are no diagonally adjacent
  plants. Triangle plants can only grow if there are no cardinally adjacent
  plants. Square plants can only grow if there are neither diagonally nor
  cardinally adjacent plants. Plants at growth level 1 require 50 water and 50
  sun to grow. Plants at growth level 2 require 75 water and 75 sun to grow.
  Plants at growth level 3 do not grow further.
- **F0.g:** The game is won when the total seeds in the player's inventory meet
  or exceed 100 in number.

### Reflection

Here is how our thinking changed over time:

- I, Jaime, was supposed to be the tool lead, and Quinlan was supposed to be the
  engine lead. I grew concerned that we were far behind, and started us off. In
  the process, by necessity, I took over some of the engine work.
- My engine implementation was really overcomplicated and highly general. For
  reference, it involved expressions like
  `await new Promise(requestAnimationFrame)` and
  `new Promise((resolve) => subscribers.push(resolve))`. It would have been
  appropriate for developing a continuous-motion 2D game with rich animations. I
  think I have a bad habit of overscoping when I'm panicking. You'd think it
  would be the opposite, but it isn't.
- Mercifully, Quinlan started from scratch and laid the groundwork for a much
  more appropriately-scoped engine. He implemented a great deal of the F0
  requirements, and I picked up where he left off and finished it up. I was
  able to constrain myself to the established implementation and coding style
  much more effectively with some work already in front of me to build on.

## Project phase F2

### How we satisfied the software requirements

- **F2.a:** The weather scenario was implemented by introducing a dynamic
  weather system that changes randomly at the start of each new day. This system
  supports three weather conditions: Sunny, Rainy, and Normal. Each condition
  influences the plants' growth by adjusting sunlight or water resources
  accordingly. A weather-specific emoji and descriptive text are displayed to
  notify the player of the current weather, ensuring an engaging and clear user
  experience. The victory condition was satisfied by requiring the player to
  collect 100 crops in their inventory. This condition is checked at the end of
  each game state update, and when achieved, a win message is displayed to the
  player, signifying successful completion of the game. This clear goal provides
  players with a sense of progression and accomplishment.
- **F2.b:** To satisfy the requirement of implementing a domain-specific
  language (DSL) for defining plant types and their unique growth rules within
  the primary programming language used for the game, I introduced a structured
  and extensible system using TypeScript. The core of this implementation is the
  PlantType enum and associated data structures like PlantGrowthResources and
  the plantGridOffsetsThatMustBeFree dictionary. The PlantType enum acts as the
  DSL's foundation, categorizing plants into Circle, Triangle, and Square, each
  with specific growth rules. These rules are encoded as predicates within
  plantGridOffsetsThatMustBeFree, ensuring flexibility and clarity. This DSL
  defines how plants interact with their environment, such as requiring free
  diagonal neighbors for Circle plants, adjacent neighbors for Triangle plants,
  and all surrounding neighbors for Square plants. By leveraging TypeScript's
  strong typing and modularity, this DSL integrates seamlessly into the game's
  logic, ensuring each plant's growth rules are dynamically and consistently
  applied.
- **F2.c:**We managed to transition the project from TypeScript to JavaScript,
  ensuring compatibility with the Deno runtime and Vite development server. The
  application consists of a dynamic grid rendered on an HTML canvas, interactive
  UI elements for managing plants, and game logic to handle actions like sowing,
  reaping, and advancing days. I configured the development environment using
  deno.json to define tasks such as dev for development and build for
  production. The HTML structure links to the updated main.js, and the game's
  features are designed to reflect real-time changes based on player actions,
  weather effects, and resource management.

### Reflection

Here is how our thinking changed over time:

- I, Anthony, was tasked with handling F2, and I believe I successfully
  implemented all the required elements to satisfy this feature. For F2, we
  already had a victory condition where collecting 100 crops would result in
  winning the game. I decided to enhance the gameplay experience by adding a
  random weather system. This system increases water or sunlight for the plants,
  thereby speeding up the gameplay.
- For F2.b, the condition was already satisfied with the help of my partner, who
  implemented special rules for each type of plant. For example, the circle
  plant cannot grow if there are other plants diagonally adjacent to it.
- For F2.c, I believe this was the most tedious task of all. Initially, I was
  unsure where to start and even considered redoing everything from scratch. I
  honestly doubted whether I would be able to complete this part until I
  realized that TypeScript is quite similar to JavaScript. From there, I found a
  terminal command to convert my main.ts file into main.js. Afterward, I made
  some minor tweaks to the index.html file and the deno.json configuration. In
  the end, I managed to complete this task and feel very proud of myself for not
  wasting too much time on it.
