# react-canvas-infinite

React Canvas Infinite adds the ability for [react-infinite](https://github.com/seatgeek/react-infinite) to render to `<canvas>` rather than DOM.

This project is work-in-progress. Current version shows the basic workflow for scrolling list.

## Motivation

After building a chat message history list via [react-infinite](https://github.com/seatgeek/react-infinite), we found that the reason of the history list feel slowly when more and more data received from the server is the DOM. Furthermore, CSS animations and transitions are the fastest path to smooth animations on the web, but they have several limitations. 

In the pursuit of 60fps scrollable list and inspired by [react-canvas](https://github.com/Flipboard/react-canvas), we constructed ```react-canvas-infinite``` that provides:

* smoothly scroll experience with large count of data.
* frame-by-frame scrolling animation.
* flex layout.
* work with React v16+.
* typescriptify.

## Demo

Head on over to [HERE](https://5f7442610a598c0022ce8700-zrvqksoczv.chromatic.com/?path=/story/example-list--normal).
