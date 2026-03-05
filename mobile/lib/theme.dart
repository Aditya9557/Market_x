import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── COLORS ────────────────────────────────────────────────
const primaryGreen = Color(0xFF10B981);
const primaryBlue = Color(0xFF3B82F6);
const primaryPurple = Color(0xFF8B5CF6);
const surfaceDark = Color(0xFF1F2937);
const bgDark = Color(0xFF111827);
const cardDark = Color(0xFF374151);

// ─── DARK THEME ────────────────────────────────────────────
final appDarkTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  scaffoldBackgroundColor: bgDark,
  textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
  colorScheme: ColorScheme.dark(
    primary: primaryGreen,
    secondary: primaryBlue,
    tertiary: primaryPurple,
    surface: surfaceDark,
  ),
  appBarTheme: AppBarTheme(
    backgroundColor: surfaceDark,
    elevation: 0,
    centerTitle: false,
    titleTextStyle: GoogleFonts.inter(
      fontSize: 20,
      fontWeight: FontWeight.bold,
      color: Colors.white,
    ),
  ),
  cardTheme: CardThemeData(
    color: surfaceDark,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(color: Colors.grey.shade800),
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: primaryGreen,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      textStyle: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w600,
      ),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: cardDark,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade700),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey.shade700),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: primaryGreen, width: 2),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: surfaceDark,
    selectedItemColor: primaryGreen,
    unselectedItemColor: Colors.grey,
    type: BottomNavigationBarType.fixed,
  ),
);

// ─── LIGHT THEME (optional) ────────────────────────────────
final appTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.light,
  colorScheme: ColorScheme.light(
    primary: primaryGreen,
    secondary: primaryBlue,
  ),
  textTheme: GoogleFonts.interTextTheme(),
);
