import SwiftUI

struct LaunchScreen: View {
    var body: some View {
        ZStack {
            Color(red: 0.11, green: 0.11, blue: 0.12) // Dark grey matching app theme
                .ignoresSafeArea()

            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 18))
        }
    }
}

#Preview {
    LaunchScreen()
}
