/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      zIndex: {
        base: "0",
        layout: "10",
        resize: "20",
        overlay: "30",
        drawer: "40",
        dropdown: "50",
        menu: "60",
        popover: "80",
        "modal-backdrop": "90",
        modal: "100",
        "modal-top": "110",
        tooltip: "120"
      },
      fontSize: {
        micro: ['9px', { lineHeight: '12px' }],
        '2xs': ['10px', { lineHeight: '14px' }],
        mini: ['11px', { lineHeight: '16px' }],
        tiny: ['13px', { lineHeight: '18px' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        glass: {
          DEFAULT: "hsl(var(--glass-bg) / var(--glass-opacity))",
          hover: "hsl(var(--glass-hover-bg) / var(--glass-hover-opacity))",
          border: "hsl(var(--glass-border) / var(--glass-border-opacity))",
        },
        badge: {
          DEFAULT: "hsl(var(--badge-bg) / var(--badge-bg-opacity))",
          foreground: "hsl(var(--badge-fg))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          text: "hsl(var(--warning-text))"
        },
        success: {
          DEFAULT: "hsl(var(--success))"
        },
        info: {
          DEFAULT: "hsl(var(--info))"
        },
        "accent-alt": {
          DEFAULT: "hsl(var(--accent-alt))",
          text: "hsl(var(--accent-alt-text))"
        },
        hover: {
          DEFAULT: "hsl(var(--bg-hover) / var(--bg-hover-opacity))"
        },
        gradient: {
          start: "hsl(var(--bg-gradient-start))",
          end: "hsl(var(--bg-gradient-end))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
