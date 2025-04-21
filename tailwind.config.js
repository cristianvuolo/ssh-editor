/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
    "./public/index.html"
  ],
  safelist: [
    'bg-gray-750',
    'hover:bg-gray-750',
    'text-gray-500',
    'text-gray-400',
    'text-gray-300',
    'text-gray-200',
    'text-blue-400',
    'text-blue-300',
    'text-purple-400',
    'text-purple-300',
    'text-red-400',
    'text-red-300',
    'hover:text-blue-300',
    'hover:text-purple-300',
    'hover:text-red-300',
    'bg-gray-700',
    'bg-gray-600',
    'bg-blue-500',
    'bg-blue-600',
    'hover:bg-blue-500',
    'hover:bg-gray-600',
    'border-gray-600'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 