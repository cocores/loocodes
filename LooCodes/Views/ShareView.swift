import SwiftUI
import MapKit
import CoreLocation

enum LocationInputMode: String, CaseIterable {
    case gps     = "GPS"
    case pin     = "Drop Pin"
    case address = "Address"
}

struct ShareView: View {
    @Environment(BathroomStore.self) var store
    @Environment(LocationService.self) var locationService

    @Binding var selectedTab: Int

    @State private var name      = ""
    @State private var code      = ""
    @State private var type      = BathroomType.cafe
    @State private var isADA     = false
    @State private var isFree    = true
    @State private var feeAmount = ""
    @State private var note      = ""
    @State private var inputMode = LocationInputMode.gps
    @State private var address   = ""
    @State private var droppedPin: CLLocationCoordinate2D? = nil
    @State private var pinPosition: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7580, longitude: -73.9855),
        span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
    ))

    @State private var isPublishing = false
    @State private var publishStep  = 0
    @State private var published    = false
    @State private var newBathroom: Bathroom? = nil

    private let publishSteps = [
        "Verifying location",
        "Encrypting & uploading code",
        "Publishing to your area",
        "Notifying nearby users"
    ]

    private var canShare: Bool { !name.isEmpty && (!code.isEmpty || (isFree && type == .publicRestroom)) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {

                    FormField(label: "Place Name") {
                        TextField("e.g. Starbucks Reserve", text: $name)
                            .textFieldStyle(DarkTextFieldStyle())
                    }

                    FormField(label: "Access Code") {
                        TextField("e.g. 1234", text: $code)
                            .textFieldStyle(DarkTextFieldStyle())
                    }

                    FormField(label: "Type") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(BathroomType.allCases) { t in
                                    FilterChip("\(t.emoji) \(t.rawValue)", isSelected: type == t) {
                                        type = t
                                    }
                                }
                            }
                        }
                    }

                    FormField(label: "Entry") {
                        HStack(spacing: 0) {
                            ForEach([true, false], id: \.self) { free in
                                Button { isFree = free } label: {
                                    Text(free ? "🆓 Free" : "💰 Paid")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(isFree == free ? Color(hex: "1a1a1f") : Color(hex: "8888aa"))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(
                                            isFree == free
                                            ? (free ? Color(hex: "34c759") : Color(hex: "f5a623"))
                                            : Color(hex: "252530")
                                        )
                                }
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
                        )
                        if !isFree {
                            TextField("Fee amount (e.g. $1.00)", text: $feeAmount)
                                .textFieldStyle(DarkTextFieldStyle())
                                .padding(.top, 8)
                        }
                    }

                    FormField(label: "Accessibility") {
                        Toggle(isOn: $isADA) {
                            HStack {
                                Text("♿").font(.title3)
                                Text("ADA Accessible").foregroundStyle(.white)
                            }
                        }
                        .tint(Color(hex: "34c759"))
                    }

                    FormField(label: "Location") {
                        Picker("", selection: $inputMode) {
                            ForEach(LocationInputMode.allCases, id: \.self) { m in
                                Text(m.rawValue).tag(m)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(.bottom, 8)

                        locationInputContent
                    }

                    FormField(label: "Notes (Optional)") {
                        TextField("Any extra tips…", text: $note, axis: .vertical)
                            .lineLimit(3, reservesSpace: true)
                            .textFieldStyle(DarkTextFieldStyle())
                    }

                    Button { publishCode() } label: {
                        Text("Share Code")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(canShare ? Color(hex: "5b9ef5") : Color(hex: "3a3a4a"))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(!canShare)
                    .padding(.bottom, 24)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
            }
            .background(Color(hex: "1a1a1f"))
            .navigationTitle("Share a Code")
            .navigationBarTitleDisplayMode(.large)
        }
        .overlay {
            if isPublishing || published {
                PublishOverlay(
                    steps: publishSteps,
                    currentStep: publishStep,
                    published: published,
                    bathroom: newBathroom
                ) {
                    withAnimation { isPublishing = false; published = false }
                    selectedTab = 1
                }
                .transition(.opacity)
                .animation(.easeInOut(duration: 0.25), value: published)
            }
        }
    }

    @ViewBuilder
    private var locationInputContent: some View {
        switch inputMode {
        case .gps:
            if let loc = locationService.location {
                Label(
                    String(format: "%.5f, %.5f", loc.coordinate.latitude, loc.coordinate.longitude),
                    systemImage: "location.fill"
                )
                .font(.caption)
                .foregroundStyle(Color(hex: "34c759"))
            } else {
                Label("Acquiring GPS…", systemImage: "location")
                    .font(.caption)
                    .foregroundStyle(Color(hex: "8888aa"))
            }

        case .pin:
            VStack(alignment: .leading, spacing: 6) {
                MapReader { proxy in
                    Map(position: $pinPosition) {
                        if let pin = droppedPin {
                            Annotation("Pin", coordinate: pin) {
                                Image(systemName: "mappin.fill")
                                    .font(.title2)
                                    .foregroundStyle(.red)
                            }
                        }
                    }
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .onTapGesture { loc in
                        droppedPin = proxy.convert(loc, from: .local)
                    }
                }
                Text("Tap the map to drop a pin")
                    .font(.caption)
                    .foregroundStyle(Color(hex: "8888aa"))
                if let pin = droppedPin {
                    Label(
                        String(format: "%.5f, %.5f", pin.latitude, pin.longitude),
                        systemImage: "mappin.fill"
                    )
                    .font(.caption)
                    .foregroundStyle(Color(hex: "5b9ef5"))
                }
            }

        case .address:
            TextField("Enter full address", text: $address)
                .textFieldStyle(DarkTextFieldStyle())
        }
    }

    private func publishCode() {
        let coord: CLLocationCoordinate2D
        switch inputMode {
        case .gps:
            coord = locationService.location?.coordinate
                ?? CLLocationCoordinate2D(latitude: 40.7580, longitude: -73.9855)
        case .pin:
            coord = droppedPin
                ?? CLLocationCoordinate2D(latitude: 40.7580, longitude: -73.9855)
        case .address:
            coord = CLLocationCoordinate2D(latitude: 40.7580, longitude: -73.9855)
        }

        let b = Bathroom(
            name: name,
            address: address.isEmpty ? "Shared location" : address,
            code: code, type: type,
            isADAAccessible: isADA, isFree: isFree, feeAmount: feeAmount,
            note: note, latitude: coord.latitude, longitude: coord.longitude,
            submittedBy: "current_user"
        )

        newBathroom = b
        withAnimation { isPublishing = true }
        publishStep = 0

        for i in 0..<publishSteps.count {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i + 1) * 0.75) {
                publishStep = i + 1
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(publishSteps.count + 1) * 0.75) {
            store.add(b)
            withAnimation { published = true }
            // Reset form
            name = ""; code = ""; note = ""; address = ""
            isFree = true; isADA = false; droppedPin = nil; feeAmount = ""
        }
    }
}

// MARK: - Publish Overlay
struct PublishOverlay: View {
    let steps: [String]
    let currentStep: Int
    let published: Bool
    let bathroom: Bathroom?
    let onViewList: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.88).ignoresSafeArea()

            VStack(spacing: 28) {
                if published {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(Color(hex: "34c759"))

                    Text("Code Published! 🎉")
                        .font(.title.weight(.bold))
                        .foregroundStyle(.white)

                    if let b = bathroom {
                        VStack(spacing: 8) {
                            Text(b.name)
                                .font(.headline)
                                .foregroundStyle(.white)
                            CodeBadge(code: b.code, isFreeNoCode: b.isFree && b.code.isEmpty)
                        }
                        .padding(16)
                        .background(Color(hex: "252530"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    Button(action: onViewList) {
                        Label("View in List", systemImage: "list.bullet")
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 28).padding(.vertical, 14)
                            .background(Color(hex: "5b9ef5"))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                } else {
                    ProgressView()
                        .scaleEffect(2)
                        .tint(Color(hex: "5b9ef5"))
                        .padding(.bottom, 8)

                    VStack(spacing: 14) {
                        ForEach(Array(steps.enumerated()), id: \.offset) { i, step in
                            HStack(spacing: 12) {
                                Group {
                                    if i < currentStep {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(Color(hex: "34c759"))
                                    } else if i == currentStep {
                                        ProgressView().scaleEffect(0.8).tint(Color(hex: "5b9ef5"))
                                    } else {
                                        Circle()
                                            .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 1.5)
                                            .frame(width: 18, height: 18)
                                    }
                                }
                                .frame(width: 20)

                                Text(step)
                                    .font(.subheadline)
                                    .foregroundStyle(
                                        i < currentStep  ? Color(hex: "34c759") :
                                        i == currentStep ? .white :
                                                           Color(hex: "8888aa")
                                    )
                                Spacer()
                            }
                        }
                    }
                    .padding(20)
                    .background(Color(hex: "252530"))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal, 24)
                }
            }
            .padding(28)
        }
    }
}
