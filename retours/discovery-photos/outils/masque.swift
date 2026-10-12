// Masques de premier plan (détourage) avec Vision (macOS 14+) : masque <photo.jpg> <prefixe>
// écrit <prefixe>-tout.png (tous les objets) et <prefixe>-<n>.png (un par objet) ; le compositeur garde le plus grand.
// Aucun pixel du produit n'est modifié : on n'extrait qu'une couche alpha.
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: masque <photo> <prefixe>"); exit(1) }
let input = URL(fileURLWithPath: args[1]), prefix = args[2]
let handler = VNImageRequestHandler(url: input, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
do {
  try handler.perform([request])
  guard let obs = request.results?.first else { print("aucun premier plan"); exit(2) }
  print("instances:", obs.allInstances.count)
  let ctx = CIContext()
  func write(_ set: IndexSet, _ name: String) throws {
    let buf = try obs.generateScaledMaskForImage(forInstances: set, from: handler)
    try ctx.writePNGRepresentation(of: CIImage(cvPixelBuffer: buf), to: URL(fileURLWithPath: prefix + "-" + name + ".png"), format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
  }
  try write(obs.allInstances, "tout")
  for i in obs.allInstances { try write(IndexSet(integer: i), String(i)) }
  print("ok")
} catch { print("erreur:", error); exit(3) }
