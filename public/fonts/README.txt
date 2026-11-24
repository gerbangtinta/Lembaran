Standard document fonts — what is here and why
==============================================

Arial, Calibri, Times New Roman and Verdana are proprietary Microsoft/Monotype fonts.
Lembaran does not ship them and never will without a licence. It uses them only when the
reader's own machine already has them (CSS `local()` in the @font-face rules).

The files in this folder are open-licensed, unmodified substitutes with the same metrics
(where a metric-compatible face exists), so a document keeps its line breaks and pagination:

  Calibri         -> Carlito          (OFL 1.1)   identical metrics
  Arial, Helvetica-> Liberation Sans  (OFL 1.1)   identical metrics
  Times New Roman -> Liberation Serif (OFL 1.1)   identical metrics
  Times           -> Liberation Serif (OFL 1.1)
  Verdana         -> DejaVu Sans      (Bitstream Vera)   close, NOT metric-compatible

Each family's licence text is in `licenses/` beside the files, and the machine-readable
mapping is in `manifest.json`. The readers alias the family names in CSS; the font files
themselves are untouched and keep their own names.

Load behaviour: every face is lazy. A browser fetches a file only when a document asks for
that family and weight, so a document that uses none of these costs nothing.
