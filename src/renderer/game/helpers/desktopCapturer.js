import { desktopCapturer, remote } from 'electron'
import toBuffer from 'blob-to-buffer'
import {
  GAME_WINDOW_NAME,
  GAME_WINDOW_WIDTH,
  GAME_WINDOW_HEIGHT,
} from '../../../_shared/constants'


const cv = remote.require('opencv4nodejs')

const FPS = 15

export const getGameWindowSource = () => new Promise(resolve => {
  desktopCapturer.getSources({ types: ['window'] }, (error, sources) => {
    if (error) {
      throw error
    }

    for (let i = 0; i < sources.length; ++i) {
      const window = sources[i]
      if (window.name === GAME_WINDOW_NAME) {
        resolve(window)
      }
    }
  })
})

export const startMediaStream = (processFrame) => getGameWindowSource().then(source => navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        minWidth: GAME_WINDOW_WIDTH,
        maxWidth: GAME_WINDOW_WIDTH,
        minHeight: GAME_WINDOW_HEIGHT,
        maxHeight: GAME_WINDOW_HEIGHT,
      },
    },
  }).then(handleMediaStream(processFrame)),
)

export const handleMediaStream = processFrame => MediaStream => {
  const video = document.createElement('video')
  const canvas = document.createElement('canvas')
  canvas.width = GAME_WINDOW_WIDTH
  canvas.height = GAME_WINDOW_HEIGHT

  video.srcObject = MediaStream
  video.onloadedmetadata = () => {
    video.play()
    stream(video, canvas, processFrame)
  }
}

export const stream = (video, canvas, processFrame) => {
  canvas.getContext('2d').drawImage(video, 0, 0, GAME_WINDOW_WIDTH, GAME_WINDOW_HEIGHT)
  canvas.toBlob((blob) => {
    toBuffer(blob, (err, buffer) => {
      const mat = cv.imdecode(buffer)
      const smallMat = mat.rescale(0.5)
      processFrame(smallMat)
      setTimeout(() => {
        stream(video, canvas, processFrame)
      }, 1000 / FPS)
    })
  })
}