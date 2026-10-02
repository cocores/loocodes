import AuthenticationServices
import SwiftUI

struct LoginView: View {
    @Environment(AuthService.self) var authService

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            Text("🚽")
                .font(.system(size: 56))
            Text("LooCodes")
                .font(.system(size: 28, weight: .heavy))
                .foregroundStyle(.white)
            Text("Find and share bathroom access codes nearby. Sign in to get started.")
                .font(.subheadline)
                .foregroundStyle(Color(hex: "8888aa"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.bottom, 12)

            SignInWithAppleButton(.signIn) { request in
                authService.prepareAppleRequest(request)
            } onCompletion: { result in
                authService.handleAppleSignIn(result)
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 32)

            Button {
                authService.signInWithGoogle()
            } label: {
                HStack(spacing: 10) {
                    Text("G").font(.headline.weight(.bold)).foregroundStyle(Color(hex: "4285F4"))
                    Text("Sign in with Google")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color(hex: "252530"))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
                )
            }
            .padding(.horizontal, 32)

            if let errorMessage = authService.errorMessage {
                Text("⚠ \(errorMessage)")
                    .font(.caption)
                    .foregroundStyle(Color(hex: "ff4d4f"))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Text("By continuing you agree to use LooCodes respectfully — shared codes are a community resource.")
                .font(.caption2)
                .foregroundStyle(Color(hex: "8888aa"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.top, 8)

            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "1a1a1f"))
    }
}
