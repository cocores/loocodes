import CoreLocation
import Observation

@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    var location: CLLocation?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func startUpdating() {
        manager.startUpdatingLocation()
    }

    // Nil (rather than a "—" placeholder) when location isn't known yet, so
    // callers can hide the distance badge entirely instead of showing a
    // non-numeric stand-in.
    func distance(to coordinate: CLLocationCoordinate2D) -> String? {
        guard let location else { return nil }
        let target = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let miles = location.distance(from: target) / 1609.34
        return String(format: "%.1f mi", miles)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        location = locations.last
    }
}
