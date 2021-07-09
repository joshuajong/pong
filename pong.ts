import { interval, fromEvent, from, zip, of, Observable, Subscriber, merge} from 'rxjs'
import { map, scan, filter, flatMap, take, concat, subscribeOn, takeUntil, timeout} from 'rxjs/operators'

function pong() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  

    // get the canvas and line created in html
    // and create several main components of the game
    const 
      line = document.getElementById("line"),
      svg = document.getElementById("canvas")!,
      paddle1 = document.createElementNS(svg.namespaceURI,'rect'), // paddle1 belongs to player1 
      paddle2 = document.createElementNS(svg.namespaceURI,'rect'), // paddle2 belongs to player2
      score1 = document.createElementNS(svg.namespaceURI,'text'),
      score2 = document.createElementNS(svg.namespaceURI,'text'),
      puck = document.createElementNS(svg.namespaceURI, 'circle'),
      gameOverText = document.createElementNS(svg.namespaceURI, "text")!,
      player1WinText = document.createElementNS(svg.namespaceURI, "text")!,
      player2WinText = document.createElementNS(svg.namespaceURI, "text")!,
      restartText = document.createElementNS(svg.namespaceURI, "text")!,
      diffcultyLevel = document.createElementNS(svg.namespaceURI, 'text');
    const objs = of(puck, paddle1, paddle2, score1, score2); // holds elements present throughout the game
    // types to use to create objects 
    type Player = {playId: () => string, paddle: Element, score: number,
      x: () => number, y: () => number, height: () => number, width: () => number,
      setX: (x: number) => void, setY: (y: number) => void};
    type Ball = {ballObj: Element, speedX: number, speedY: number, speed: number,
      x: () => number, y: () => number, color: () => string, radius: () => number,
      setX: (x: number) => void, setY: (y: number) => void};
    type state = {gameStatus: number, level: number};
    type Text = Readonly<[[Element, string], [Element, string], [Element, string], [Element, string], [Element, string]]>;
    // create Player objects with properties that can set and get element attributes
    const player1: Player = {
      playId: () => "player1",
      paddle: paddle1,
      score: 0,
      x: () => Number(paddle1.getAttribute('x')),
      y: () => Number(paddle1.getAttribute('y')),
      height: () => Number(paddle1.getAttribute('height')),
      width: () => Number(paddle1.getAttribute('width')),
      setX: (x) => paddle1.setAttribute('x', String(x)), // updates x coordinate of paddle
      setY: (y) => paddle1.setAttribute('y', String(y)) // updates y coordinates of paddle
    };
    const player2: Player = {
      playId: () => "player2",
      paddle: paddle2,
      score: 0,
      x: () => Number(paddle2.getAttribute('x')),
      y: () => Number(paddle2.getAttribute('y')), 
      height: () => Number(paddle2.getAttribute('height')),
      width: () => Number(paddle2.getAttribute('width')),
      setX: (x) => paddle2.setAttribute('x', String(x)), // updates x coordinate of paddle
      setY: (y) => paddle2.setAttribute('y', String(y)) // updates y coordinate of paddle
    };
    // create a ball object which holds all attributes of the puck -- the element
    // speedX is in horizontal direction, speedY in vertical and speed is overall speed (used to determine rebound speed at different angles)
    const ball: Ball = {
      ballObj: puck,
      speedX: 5, speedY: 5, speed: 10,  
      x: () => Number(puck.getAttribute('cx')),
      y: () => Number(puck.getAttribute('cy')),
      color: () => puck.getAttribute('fill'),
      radius: () => Number(puck.getAttribute('r')),
      setX: (x) => puck.setAttribute('cx', String(x)), // updates x coordinate of ball
      setY: (y) => puck.setAttribute('cy', String(y)) // updates y coordinate of ball
    };
    // startState contains all functions to create and display basics like score, paddle and texts 
    // and takes as an argument the difficulty level chosen by user -- either key code 69 or 72
    const startState = (difficulty: number): void => {
      // initBallSpeed sets initial speeds of the ball in every game (is constant)
      const initBallSpeed = (): void => {ball.speedX = 5; ball.speedY = 5; ball.speed = 10;};
      // create two scores -- one for each player //
      const displayScore = (): void => {
        const scoreAttr= [['x', String(Number(svg.getAttribute('width'))/4-20)], ['y', String(Number(svg.getAttribute('height'))/4)],
        ['fill', 'white'], ['font-size', '70'], ['font-family', 'Impact']];  // x and y coordinates adjusted to obtain optimal display position
        scoreAttr.forEach(x => {score1.setAttribute(x[0], x[1]); score2.setAttribute(x[0], x[1])}); // both scores for player1 and player2 are initially at the same position
        of(score1, score2).subscribe(x => {
          x === score2 ? x.setAttribute('x', String(Number(x.getAttribute('x'))*3+40)) : x; // reset the position of score2 to player2 side of the canvas
          svg.appendChild(x);  // displays each score on canvas
        });
      };
      // createPaddle creates two paddles and takes as an argument, diffculty from startState 
      // like the scores, both paddles are initially at the same position
      const createPaddle = (diff: number): void => {
        const paddleAttr = [['x', '10'], ['y', String(Number(svg.getAttribute('height'))/2-25)],
        ['width', '10'], , ['height', '50'], ['fill', 'white']];
        paddleAttr.forEach(x => {paddle1.setAttribute(x[0], x[1]); paddle2.setAttribute(x[0], x[1])});
        // sets the size of user's paddle according to the difficulty chosen
        diff === 69 ? paddle1.setAttribute('height', '80') : paddle1.setAttribute('height', '50');
        // set position and visuals of paddles
        of(paddle1, paddle2).subscribe(x => {
          x === paddle2 ? x.setAttribute('x', String(Number(svg.getAttribute('width'))-2*Number(x.getAttribute('width')))) : x; // shift paddle2 to the right side of the canvas
          svg.appendChild(x);
        })
      };
      // createBall creates and displays puck element
      // createBall takes as an argument, difficulty from startState to determine the ball radius
      // puck is set to always be initially slightly to the right of paddle1 as per the rules in the report
      const createBall = (diff: number): void => {
        const puckAttr = [['cx', '30'], ['cy', '300'], ['fill', 'yellow']];
        puckAttr.forEach(x => puck.setAttribute(x[0], x[1]));
        diff === 69 ? puck.setAttribute('r', '15') : puck.setAttribute('r', '10'); // sets the size of the puck according to the difficulty chosen
        svg.appendChild(puck);
      };
      initBallSpeed(); displayScore(); createBall(difficulty); createPaddle(difficulty);  // calling all functions in startState
    } 
    // initText assigns text content to each text element and sets their attributes
    const initText = (): void => {
      const arr: Text = [[gameOverText, "Game Over (click to continue)"], [player1WinText, "You win! :)"],
                        [player2WinText, "Opponent wins :("], [restartText, "Press ENTER to restart"], [diffcultyLevel, "Hard(H) or Easy(E)"]];
      const textElem = of(gameOverText, player1WinText, player2WinText, restartText, diffcultyLevel);
      arr.forEach(x => x[0].textContent = x[1]);
      const textAttr = [['x', String(Number(svg.getAttribute('width'))/6-60)], ['y', String(Number(svg.getAttribute('height'))*0.5-100)], 
      ['font-size', '40'], ['font-family', 'Impact'], ['fill', 'white']];  // x and y coordinates adjusted to fit canvas and all texts have same attributes
      textElem.subscribe(x => {
        textAttr.forEach(y => x.setAttribute(y[0], y[1])) // set attributes for all texts
      });
    }
    // displayText takes two arguments -- text which is the text to be displayed and an array  -- and displays the text on svg
    // prevText to indicate texts to be removed from the canvas
    const displayText = (text: Element, prevText: Element[] = null): void => {
      prevText ? prevText.forEach(x => svg.removeChild(x)) : 0; // remove all previous texts displayed on canvas
      const winnertextAttr = [['y', String(Number(gameOverText.getAttribute('y'))+60)], ['x', String(Number(gameOverText.getAttribute('x'))+50)]];
      text === player1WinText || player2WinText ? winnertextAttr.forEach(x => text.setAttribute(x[0], x[1])) : 0; // adjust the coordinates of winner's text so it won't overlap with gameOverText when displayed
      svg.appendChild(text);  // display text 
    };
    // functions to handle possible scenarios when the game is being played 
    // the boundaries of the canvas are the walls
    // determinePlayer determines which player's court the ball is in and returns that player
    const determinePlayer = (): Player => (ball.x() >= Number(svg.getAttribute('width'))/2) ? player2 : player1
    // determinePlayerWin determines which player scored the goal and returns that player
    const determinePlayerWin = (): Player => (ball.x() >= Number(svg.getAttribute('width'))/2) ? player1 : player2
    // following functions deal with collisions -- detecting them and handling them 
    const
      // paddleCollision takes a player as an argument and 
      // determines whether the ball collides with a that player's paddle and returns true if so and false otherwise
      paddleCollision = (player: Player): boolean => {
        const playerTop = player.y(), // top edge of paddle
        playerBtm = player.y() + player.height(), // bottom edge of paddle
        playerRightSide = player.x() + player.width(), // right edge of paddle
        playerLeftSide = player.x(), // left edge of paddle
        ballTop = ball.y() - ball.radius(), // top edge of ball
        ballBtm = ball.y() + ball.radius(), // bottom edge of ball
        ballLeft = ball.x() - ball.radius(), // left edge of ball
        ballRight = ball.x() + ball.radius(); // right edge of ball
        return(ballTop < playerBtm) && (ballBtm > playerTop) && (ballLeft < playerRightSide) && (ballRight > playerLeftSide)
      },
      // rightWallCollision determines whether a ball hits player2's side of the wall and returns true if so and false otherwise
      rightWallCollision = (): boolean => (ball.x()+ball.radius()) >= Number(svg.getAttribute('width')),
      // leftWallCollision determines whether a ball hits player1's side of the wall and returns true if so and false otherwise
      leftWallCollision = (): boolean => ((ball.x()-ball.radius()) <= 0),
      // topDownWallCollision determines whether a ball hits the top or bottom of the wall and returns true if so and false otherwise
      topDownWallCollision = (): boolean => (ball.y()+ball.radius()*2 >= Number(svg.getAttribute('height')) || ball.y()-ball.radius() <= 0)
    // following functions do calculations to determine the movement of the ball 
    const
      // calculateTheta returns an angle depending on which part of the paddle the ball hits 
      // if the ball hits the middle of the paddle, then the rebound angle will be 0
      // if the ball hits the upper portion of the paddle, then the rebound angle is 45 degrees counterclockwise
      // if the ball hits the lower portion of the paddle, then the rebound angle is 45 degrees clockwise
      calculateTheta = (player = determinePlayer()): number => {
        return ball.y() === player.height()*0.5 + player.y() ? 0 :
        ((ball.y()<(player.height()*0.5+player.y())) ? -1*Math.PI/4 : Math.PI/4);
      },
      // movePuck updates the puck's coordinates on the svg to simulate movement based on the current speeds of the ball
      movePuck = (): void => {
        ball.setX(ball.x() + ball.speedX); 
        ball.setY(ball.y() + ball.speedY);
      },
      // moveAI updates paddle2's position so as to always follow the ball which depends on whether the ball's y-coordinate is nearing the top, bottom or within the middle portion of the canvas
      moveAI = (player: Player = player2): void => {
        (ball.y()+ball.radius()*2 > 540) ? player.setY(540) : ( // 540 is taken from height of canvas - height of paddle - 10
        (ball.y()+ball.radius()*2 < 35) ? player.setY(10) : // 35 is half the height of paddle + 10
          player.setY(ball.y()+ball.radius()*2-player.height()) // for all other coordinates the ball is at on the canvas
        );
      },
      // updateScore takes as an argument a player and updates the score of that player
      // point is an optional argument - it's default is 1
      // restart is an optional argument which is default to false; when true, it signals that the game is restarting so the scores are set to 0 for both players
      updateScore = (player: Player, point: number = 1, restart: boolean = false): void => {
        restart ? player.score = point : player.score += point;
        player.playId() === "player1" ? score1.innerHTML = String(player.score) : score2.innerHTML = String(player.score);
      },
      // change speed of the moving ball -- used at the start of the game to move the ball and when it collides with a paddle
      changeSpeed = (): void => {
        // change speeds of the ball according to the part of paddle it collides with
        ball.speedX = ((determinePlayer() === player1) ? 1 : -1) * ball.speed * Math.cos(calculateTheta())
        ball.speedY = (ball.speed * Math.sin(calculateTheta()));
        ball.speed += 1; // increment speed to make ball accelerate
      };
    // the function below, play, allows the game to be played when the function is called
    const play = (): void => {
      // gameStatus acts as a game token to determine which state the game is currenty in
      // level indicates the level of difficulty chosen by user
      const gamePlay: state = {gameStatus: 1, level: 0};
      // following observable displays a text at the start of the game for player to choose difficulty
      const intrvl$ = interval(10);
      intrvl$.pipe(
        filter(_ => gamePlay.gameStatus === 1)
      ).subscribe(_ => {
        initText();  // set attributes of all text
        line.classList.remove("vl"); // removes the white line created by html so text can be displayed properly
        displayText(diffcultyLevel); // prompts user with choice of difficulty level 
        gamePlay.gameStatus = 2;  // prepares for game setup (creating elements and displaying)
      });
      // following observables creates and displays the game 
      // uses the keycode of the keyboard keys H and E to determine diffculty level -- hard is 72; easy is 69
      const diffH = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(_ => gamePlay.gameStatus === 2),
        filter(e => e.keyCode === 72), // H key
        map(e => e.keyCode) // get keycode to be used as level
      );
      const diffE = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(_ => gamePlay.gameStatus === 2),
        filter(e => e.keyCode === 69), // E key
        map(e => e.keyCode) // get keycode to be used as level
      );
      // merge diffH and diffE and subscribe since both have similar subscription calls to display the game elements
      merge(diffH, diffE).subscribe(n => {
        gamePlay.level = n;  // sets the difficulty in the current game
        svg.removeChild(diffcultyLevel); // removes the difficulty prompt
        line.classList.add("vl");  // adds white line to svg 
        startState(n); // create and display game setup
        [player1, player2].forEach(x => updateScore(x, 0, true));  // initial score of both players is 0
        gamePlay.gameStatus = 3; // transition to observable to handle in game animations
      });
      const mouseClick$ = fromEvent<MouseEvent>(svg, "mousedown"); // a click will indicate the start of a game 
      mouseClick$.pipe(
        filter(_ => gamePlay.gameStatus === 3)
        ).subscribe(_=> {
          changeSpeed(); // changes the speed of the ball depending on the position of the paddle
          gamePlay.gameStatus = 4; // transitions to next part where the game has already begun (collisions can happen)
          movePuck(); moveAI(); // display the movement of player2 and the ball on the svg
        });
      // handles collisions by changing the speed of the ball depending on which part of the wall or paddle the ball hits
      const collision$ = interval(10).pipe(filter(_ => gamePlay.gameStatus === 4))  
      collision$.pipe(filter(_ => topDownWallCollision())).subscribe(_ => {ball.speedY *= -1}) // ensures ball goes in the opposite direction after hitting the top or bottom wall
      // changes speed of the ball depending on the part of paddle hit
      collision$.pipe(filter(_ => paddleCollision(determinePlayer()))).subscribe(_ => {
          changeSpeed(); // changes speed of the ball depending on which paddle and which part the ball hits
      });
      // handles situation where player scores a goal
      collision$.pipe(filter(_ => rightWallCollision() || leftWallCollision())).subscribe(_ => {
          gamePlay.gameStatus = 5; // transition to updating score phase of game
          updateScore(determinePlayerWin()); // increments the winning player's score by 1
      });
      collision$.subscribe(_ => {movePuck(), moveAI()});  // updates positions of player2 and the ball on the svg with values depending on which (if any) collision occurs
      // handles situations after ball hits either the right or left side of the wall
      const endGame$ = interval(1000).pipe(filter(_ => gamePlay.gameStatus === 5));
      endGame$.pipe(filter(_ => player1.score !== 7 && player2.score !== 7)).subscribe(_ => {  
          startState(gamePlay.level);  // reset the game to initial display with the same difficulty
          gamePlay.gameStatus = 3;  // listen for user mousedown to start again
      });
      endGame$.pipe(filter(_ => player1.score === 7 || player2.score === 7)).subscribe(_ => {  // reset the game if neither player reaches 7 points or otherwise, the game ends
          gamePlay.gameStatus = 6; // transition to phase where user can choose to restart the game  
          line.classList.remove("vl"); // remove white line to allow text to display properly
          objs.subscribe(x => svg.removeChild(x)); // remove all elements on the svg
          player1.score === 7 ? of(gameOverText, player1WinText).subscribe(x => displayText(x)) : of(gameOverText, player2WinText).subscribe(x => displayText(x))  // create and display game over text and indicate winner
        })
      // displays text asking if user wants to play again and removes previous game over text
      mouseClick$.pipe( // runs if user clicks on their mouse
        filter(_ => gamePlay.gameStatus === 6)
        ).subscribe(_ => {
            player1.score === 7 ? displayText(restartText, [gameOverText, player1WinText]) : displayText(restartText, [gameOverText, player2WinText]); // remove previous texts and displays prompt asking user to choose whether or not to restart
            gamePlay.gameStatus = 7; // transition to observable to handle a restart
          })
      const replay$ = fromEvent<KeyboardEvent>(document, "keydown") // restart the game from the "choosing difficulty" part again if user presses ENTER 
      replay$.pipe(
        filter(_ => gamePlay.gameStatus === 7),
        filter(e => e.keyCode === 13)  // key code for ENTER is 13
      ).subscribe(_ => {
        svg.removeChild(restartText); // remove the text displayed
        gamePlay.gameStatus = 1; // return to "difficulty level" prompt stream
      })
      // paddle1 - user's paddle will be controlled by mouse movement while the mouse is on the canvas
      // code for mousePosObservable() is obtained from FIT2102 Week 4 Lab with some modifications
      const mousePosObservable = fromEvent<MouseEvent>(document, "mousemove").pipe(
        map(({ clientX, clientY }) => ({ x: clientX, y: clientY })),
        filter(({x, y}) => x <= Number(svg.getAttribute('width')) && y <= Number(svg.getAttribute('height'))+80 && y >= 80))  // 80 is y coordinate of top of the canvas
        mousePosObservable.pipe(filter(_ => gamePlay.level === 69)).subscribe(coord => paddle1.setAttribute('y', String((coord.y < 180) ? 10 : (coord.y-90-Number(paddle1.getAttribute('height'))))))  // 90 = 80 + 10 (paddle cannot be less than 10 units from the top of canvas) and 180 is for 80 + height of the paddle for Easy
        mousePosObservable.pipe(filter(_ => gamePlay.level === 72)).subscribe(coord => paddle1.setAttribute('y', String((coord.y < 150) ? 10 : (coord.y-90-Number(paddle1.getAttribute('height'))))))  // 90 = 80 + 10 (paddle cannot be less than 10 units from the top of canvas) and 150 is for 80 + height of the paddle for Hard
    };
    of(play).subscribe(x => x())}   // calls the function to initialise the game
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{pong();}