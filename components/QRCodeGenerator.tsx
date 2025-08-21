import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export default function QRCodeGenerator({ 
  value, 
  size = 200, 
  color = '#000000', 
  backgroundColor = '#FFFFFF' 
}: QRCodeGeneratorProps) {
  // Simple QR code pattern generator
  const generateQRPattern = (data: string) => {
    const gridSize = 21; // Standard QR code size
    const pattern: boolean[][] = [];
    
    // Initialize grid
    for (let i = 0; i < gridSize; i++) {
      pattern[i] = new Array(gridSize).fill(false);
    }
    
    // Generate pattern based on data hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Create finder patterns (corners)
    const addFinderPattern = (x: number, y: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (x + i < gridSize && y + j < gridSize) {
            const isEdge = i === 0 || i === 6 || j === 0 || j === 6;
            const isInner = (i >= 2 && i <= 4) && (j >= 2 && j <= 4);
            pattern[x + i][y + j] = isEdge || isInner;
          }
        }
      }
    };
    
    // Add finder patterns
    addFinderPattern(0, 0); // Top-left
    addFinderPattern(0, gridSize - 7); // Top-right
    addFinderPattern(gridSize - 7, 0); // Bottom-left
    
    // Fill data area with pseudo-random pattern
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // Skip finder patterns
        if ((i < 9 && j < 9) || 
            (i < 9 && j >= gridSize - 8) || 
            (i >= gridSize - 8 && j < 9)) {
          continue;
        }
        
        // Generate pseudo-random pattern
        const seed = hash + i * gridSize + j;
        pattern[i][j] = (seed % 3) === 0;
      }
    }
    
    return pattern;
  };
  
  const pattern = generateQRPattern(value);
  const cellSize = size / pattern.length;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill={backgroundColor}
        />
        
        {/* QR Pattern */}
        <G>
          {pattern.map((row, i) =>
            row.map((cell, j) => {
              if (cell) {
                return (
                  <Rect
                    key={`${i}-${j}`}
                    x={j * cellSize}
                    y={i * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={color}
                  />
                );
              }
              return null;
            })
          )}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});