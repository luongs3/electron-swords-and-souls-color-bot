import robot from 'robotjs'
import { GAME_WINDOW_WIDTH } from '../../../_shared/constants'
import { getMask, getRegion } from './image'
import { drawSquareAroundCenter } from './draw'
import { colorObjectToVector } from './color'
import { findNonZeroMatches } from './search'
import { Rectangle, pointsDiff } from './geometry'
import { shuffle } from './array'


export const drawMatches = ({ type, mat, lowerColor, upperColor, blur }) => {
  const scale = 3
  const matches = []

  const targetRegion = getRegion(mat, { x: 1, y: 1 }, mat.cols - 50, mat.rows - 50)
  // There should be some more complicated logic what to detect and when to detect
  // so that the bot can do various tasks
  const rescaledMat = targetRegion.rescale(1 / scale)

  type.find.map((type) => {
    const matMasked = getMask(rescaledMat, colorObjectToVector(lowerColor[type]), colorObjectToVector(upperColor[type]), blur[type])
    const foundMatches = findNonZeroMatches(matMasked)

    foundMatches.forEach(match => {
      matches.push({
        x: match.x * scale,
        y: match.y * scale,
        type,
      })
      drawSquareAroundCenter(
        mat,
        {
          x: match.x * scale,
          y: match.y * scale,
        },
        10,
        false,
      )
    })
  })
  return matches
}

export const playAttack = ({ mat, matches }) => {
  robot.setKeyboardDelay(50)

  const wallX = 78

  const areas = [
    {
      rectangle: new Rectangle({ x: 57, y: 140 }, 21, 55),
      name: 'center',
    },
    {
      rectangle: new Rectangle({ x: wallX, y: 95 }, 72, 45),
      name: 'appleTop',
      key: 'up',
    },
    {
      rectangle: new Rectangle({ x: wallX, y: 145 }, 102, 25),
      name: 'appleMid',
      key: 'right',
    },
    {
      rectangle: new Rectangle({ x: wallX, y: 175 }, 102, 25),
      name: 'appleBottom',
      key: 'down',
    },
    {
      rectangle: new Rectangle({ x: 20, y: 120 }, 25, 43),
      name: 'star',
      key: 'left',
    },
  ]

  // Draw helper rectangles
  areas.forEach(area => area.rectangle.draw(mat))

  const relevantMatches = []
  matches.forEach(match => {
    areas.forEach(area => {
      const isIn = area.rectangle.isIn(match)
      if (isIn) {
        relevantMatches.push({
          areaName: area.name,
          ...match,
        })
      }
    })
  })

  if (relevantMatches.length) {
    const relevant = relevantMatches.map(relevant => {
      const area = areas.find(area => area.name === relevant.areaName)
      return {
        ...relevant,
        area,
      }
    })

    const stars = relevant.filter(item => item.type === 'star').filter(item => item.areaName === 'star')
    const apples = relevant.filter(item => item.type === 'apple').filter(item => item.areaName === 'appleTop' || item.areaName === 'appleMid' || item.areaName === 'appleBottom')

    if (apples.length < 2 && stars.length) {
      robot.keyTap('left')
    } else if (apples.length) {
      const distances = []
      apples.forEach((apple, index) => {
        const distance = apple.x - wallX
        distances[index] = distance
      })

      if (distances.length) {
        const indexOfSmallestMatch = distances.indexOf(Math.min.apply(null, distances))
        robot.keyTap(apples[indexOfSmallestMatch].area.key)
      }
    }
  }
}

export const playDefence = ({ mat, matches }) => {
  robot.setMouseDelay(1)
  const centerTopLeft = { x: 160, y: 110 }
  const centerWidth = 35
  const centerHeight = 55
  const areas = [
    {
      rectangle: new Rectangle(centerTopLeft, centerWidth, centerHeight),
      name: 'center',
    },
  ]

  const centerPoint = {
    x: centerTopLeft.x + (centerWidth / 2),
    y: centerTopLeft.y + (centerHeight / 2),
  }

  // Draw helper rectangles
  areas.forEach(area => area.rectangle.draw(mat))

  const distances = []
  matches.forEach((match, index) => {
    const distance = pointsDiff(centerPoint, match)
    if (distance > 10) {
      distances[index] = distance
    }
  })

  const indexOfSmallestMatch = distances.indexOf(Math.min.apply(null, distances))
  const closestApple = matches[indexOfSmallestMatch]

  const gameWindowX = GAME_WINDOW_WIDTH * 2
  const gameWindowY = 25

  // robot.moveMouseSmooth(gameWindowX, gameWindowY)

  if (closestApple) {
    const targetX = closestApple.x + gameWindowX
    const targetY = closestApple.y + gameWindowY
    robot.moveMouse(targetX, targetY)
  }
}

export const playRange = ({ mat, matches }) => {
  robot.setMouseDelay(100)
  console.log('matches ', matches)

  const gameWindowX = GAME_WINDOW_WIDTH * 2
  const gameWindowY = 25

  if (matches.length) {
    const shuffled = shuffle(matches)
    const targetX = shuffled[0].x + gameWindowX - 6
    const targetY = shuffled[0].y + gameWindowY - 6
    robot.moveMouse(targetX, targetY)
    robot.mouseClick('left')
  }
}
