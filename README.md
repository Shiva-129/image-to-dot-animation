# SHOUKO - Image to Animated Dots

SHOUKO is an interactive web application that transforms photographs into dynamic, animated dot fields with customizable visual effects and interactive behaviors. The application converts images into particle-based artwork where each dot represents a sampled pixel from the original image.

## Features

### Image Processing
- Upload images via file input or drag-and-drop interface
- Automatic image scaling and aspect ratio preservation
- Pixel sampling with adjustable density for optimal performance
- Support for various image formats through browser compatibility

### Visual Customization
- **Default Shape Selection**: Choose from dots, triangles, moons, hearts, arrows, squares, diamonds, or stars
- **Dot Size Control**: Adjustable particle size from 1 to 12 pixels
- **Density Settings**: Control the number of particles generated (4-24 range)
- **Background Color**: Customizable canvas background
- **Animation Styles**: 
  - None: Static particles
  - Pulse: Rhythmic scaling animation
  - Float: Wave-like vertical movement
  - Twinkle: Random opacity variations

### Interactive Hover Effects
- **Fade**: Particles fade out when mouse approaches
- **Repel**: Particles scatter away from cursor with physics simulation
- **Attract**: Particles are drawn toward cursor with magnetic-like behavior
- **Change Shape**: Particles transform into different shapes on hover
- **Combined Effects**: Secondary hover effects can be layered with shape changes

### Advanced Shape System
The application includes a comprehensive shape drawing system with seven distinct geometric forms:
- **Star**: Five-pointed star with inner and outer radius calculations
- **Moon**: Crescent moon with background cutout effect
- **Heart**: Curved heart shape using bezier curve mathematics
- **Arrow**: Pointed directional arrow
- **Square**: Standard square geometry
- **Diamond**: Rotated square (diamond) shape
- **Triangle**: Equilateral triangle pointing upward

### Physics Simulation
- Spring-based particle system with home position restoration
- Velocity damping for smooth motion
- Force calculations for repel and attract effects
- Collision boundaries with canvas edges
- Real-time physics updates at 30 FPS

### Export Capabilities
- **PNG Export**: Static image capture of current dot field
- **JSON Export**: Portable data format containing particle positions, colors, and configuration
- **ZIP Package**: Complete export with JSON data, player script, and documentation

## Technical Implementation

### Architecture
The application is built using vanilla JavaScript with HTML5 Canvas for rendering. The codebase follows a modular structure with separate concerns for:
- Particle physics and animation
- Shape drawing algorithms
- User interface management
- File handling and export functionality

### Performance Optimization
- Efficient particle rendering with canvas composite operations
- Optimized physics calculations with delta time integration
- Responsive canvas sizing with maximum dimension constraints
- Memory management for image processing and particle arrays

### Browser Compatibility
- Modern browser support for HTML5 Canvas and ES6 features
- File API support for drag-and-drop functionality
- RequestAnimationFrame for smooth animations
- Blob API for file downloads

## User Interface

The interface features a clean, dark-themed design with:
- Left sidebar containing all control options
- Main canvas area for visual output
- Responsive layout that adapts to different screen sizes
- Intuitive dropdown menus and range sliders
- Real-time preview of all changes

## Use Cases

SHOUKO is suitable for:
- Digital art creation and experimentation
- Educational demonstrations of particle systems
- Interactive visual presentations
- Creative image processing and transformation
- Prototyping interactive visual effects

The application provides a balance between artistic expression and technical demonstration, offering users the ability to create unique visual experiences while understanding the underlying mechanics of particle systems and interactive graphics.
